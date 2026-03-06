import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { provisionLiveKitSip } from "@/app/lib/livekit-sip";
import crypto from "crypto";
import https from "https";

const MAGNUS_URL = process.env.MAGNUSBILLING_URL || "https://voice00.epic.dm/mbilling";
const MAGNUS_KEY = process.env.MAGNUSBILLING_API_KEY || "";
const MAGNUS_SECRET = process.env.MAGNUSBILLING_API_SECRET || "";

/* ---------- HTTPS POST helper (bypasses expired cert) ---------- */
function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body).toString() },
        rejectUnauthorized: false,  // TEMP: bypass expired cert
      } as any,
      (res) => {
        let chunks = "";
        res.on("data", (c: Buffer) => (chunks += c.toString()));
        res.on("end", () => resolve({ status: res.statusCode || 500, data: chunks }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/* ---------- Magnus HMAC-signed API helper ---------- */
async function magnus(module: string, action: string, params: Record<string, string> = {}) {
  const nonce = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = new URLSearchParams({ module, action, nonce, ...params });
  const payload = body.toString();
  const sign = crypto.createHmac("sha512", MAGNUS_SECRET).update(payload).digest("hex");

  const url = `${MAGNUS_URL}/index.php/${module}/${action}`;

  let status: number;
  let text: string;

  if (url.startsWith("https://")) {
    const result = await httpsPost(
      url,
      { "Content-Type": "application/x-www-form-urlencoded", Key: MAGNUS_KEY, Sign: sign },
      payload
    );
    status = result.status;
    text = result.data;
  } else {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Key: MAGNUS_KEY, Sign: sign },
      body: payload,
    });
    status = res.status;
    text = await res.text();
  }

  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: status >= 200 && status < 300, status, data };
}

/* ---------- Step 1: Find an available DID ---------- */
async function findAvailableDid(preferred?: string) {
  if (preferred) {
    const filter = JSON.stringify([
      { type: "string", field: "did", value: preferred, comparison: "eq" },
      { type: "numeric", field: "reserved", value: 0, comparison: "eq" },
    ]);
    const r = await magnus("did", "read", { filter, limit: "1" });
    if (r.ok && r.data?.rows?.[0]) return { ok: true as const, did: r.data.rows[0] };
  }
  const filter = JSON.stringify([
    { type: "numeric", field: "reserved", value: 0, comparison: "eq" },
  ]);
  const r = await magnus("did", "read", { filter, limit: "1" });
  if (!r.ok) return { ok: false as const, error: "Magnus DID lookup failed", raw: r };
  const row = r.data?.rows?.[0];
  if (!row) return { ok: false as const, error: "No available DIDs in Magnus", raw: r.data };
  return { ok: true as const, did: row };
}

/* ---------- Step 2: Create a SIP user for this agent ---------- */
async function createSipUser(username: string, password: string, didNumber: string) {
  return magnus("sip", "save", {
    id: "0",                        // 0 = create new
    id_user: "1",                   // Magnus admin user (MVP)
    name: username,
    accountcode: didNumber,
    secret: password,
    host: "dynamic",
    context: "billing",
    callerid: didNumber,
    allow: "g729,ulaw,alaw",
    nat: "force_rport,comedia",
    qualify: "yes",
  });
}

/* ---------- Step 3: Assign DID to SIP user ---------- */
async function assignDidToSip(didId: string, sipUserId: string) {
  return magnus("did", "save", {
    id: didId,
    id_user: sipUserId,
    reserved: "1",
  });
}

/* ---------- Route handler ---------- */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!MAGNUS_KEY || !MAGNUS_SECRET) {
    return NextResponse.json({ error: "Magnus credentials not configured" }, { status: 500 });
  }

  const { preferredNumber } = await req.json();

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Create an agent first in Settings" }, { status: 404 });

  if (agent.phoneStatus === "provisioned" && agent.phoneNumber) {
    return NextResponse.json({
      ok: true,
      phoneNumber: agent.phoneNumber,
      status: "provisioned",
      sip: agent.config?.magnus,
    });
  }

  // 1. Find available DID
  const didResult = await findAvailableDid(preferredNumber);
  if (!didResult.ok) {
    return NextResponse.json({ error: didResult.error, details: (didResult as any).raw }, { status: 404 });
  }
  const didRow = didResult.did;
  const didNumber = didRow.did;
  const didId = didRow.id;

  // 2. Create SIP user
  const shortId = agent.id.slice(0, 8);
  const sipUsername = `aiva-${shortId}`;
  const sipPassword = crypto.randomBytes(12).toString("base64url");

  const sipResult = await createSipUser(sipUsername, sipPassword, didNumber);
  if (!sipResult.ok) {
    return NextResponse.json({ error: "Failed to create SIP account", details: sipResult.data }, { status: 502 });
  }
  const sipId = sipResult.data?.id || sipResult.data?.rows?.[0]?.id;

  // 3. Assign DID to SIP user
  if (sipId && didId) {
    const assignResult = await assignDidToSip(String(didId), String(sipId));
    if (!assignResult.ok) {
      return NextResponse.json({ error: "Failed to assign DID", details: assignResult.data }, { status: 502 });
    }
  }

  // 4. Create LiveKit SIP trunk + dispatch rule
  let livekit: { trunkId?: string; ruleId?: string } = {};
  try {
    livekit = await provisionLiveKitSip(didNumber, agent.id, user.id);
  } catch (e: any) {
    // LiveKit is optional for MVP — log but don't block provisioning
    console.warn("LiveKit SIP provisioning failed (non-blocking):", e.message);
  }

  // 5. Save to local DB
  agent.phoneNumber = didNumber;
  agent.phoneStatus = "provisioned";
  agent.config = {
    ...(agent.config || {}),
    magnus: {
      did: didNumber,
      did_id: didId,
      sip_username: sipUsername,
      sip_password: sipPassword,
      sip_id: sipId,
      sip_domain: "voice00.epic.dm",
      sip_port: 5060,
    },
    livekit: {
      trunk_id: livekit.trunkId || null,
      rule_id: livekit.ruleId || null,
    },
  };
  agent.updatedAt = new Date().toISOString();
  await saveDb();

  return NextResponse.json({
    ok: true,
    phoneNumber: didNumber,
    status: "provisioned",
    sip: {
      username: sipUsername,
      domain: "voice00.epic.dm",
      port: 5060,
    },
  });
}
