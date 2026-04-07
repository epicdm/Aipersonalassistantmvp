import { NextRequest, NextResponse } from "next/server";

declare global {
  var _bffOtpStore: Map<string, { code: string; expiresAt: number }> | undefined;
}
if (!global._bffOtpStore) global._bffOtpStore = new Map();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toE164(raw: string): string {
  let n = raw.replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("+")) return n;
  const digits = n.replace(/\D/g, "");
  if (digits.length <= 7) return `+1767${digits}`;          // local: 2958382 → +17672958382
  if (digits.length === 10) return `+1${digits}`;            // NANP: 7672958382 → +17672958382
  return `+${digits}`;                                        // international
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const e164 = toE164(phone);
    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    global._bffOtpStore!.set(e164, { code, expiresAt });

    const message = `Your BFF code: ${code}. Valid for 10 minutes.`;

    const res = await fetch("http://818.epic.dm:9080/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from("smsapi_19905e5b:a3Q9VOE0eoT4YAQ6pckg").toString("base64"),
      },
      body: JSON.stringify({ to: e164, message, from: "BFF" }),
    });

    const body = await res.json();
    console.log(`SMS to ${e164}: ${res.status} ${JSON.stringify(body)}`);

    if (!res.ok || !body.success) {
      console.error("SMS failed:", body);
      return NextResponse.json({ error: "Failed to send SMS. Try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
