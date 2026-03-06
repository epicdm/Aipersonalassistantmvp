// WhatsApp session manager with pairing code support
// Baileys is loaded dynamically at runtime only
import path from "path";
import fs from "fs";

const AUTH_BASE = path.join(process.cwd(), "data", "whatsapp-sessions");

const sessions: Map<string, {
  qrDataUrl: string | null;
  pairingCode: string | null;
  status: "disconnected" | "qr_ready" | "connecting" | "connected";
  error?: string;
  socket: any;
}> = new Map();

export async function startWhatsAppSession(userId: string, phoneNumber?: string): Promise<{
  qrDataUrl?: string;
  pairingCode?: string;
  status: string;
  error?: string;
}> {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import("@whiskeysockets/baileys");
  const QRCode = (await import("qrcode")).default;

  // Kill existing socket
  const existing = sessions.get(userId);
  if (existing?.socket) {
    try { existing.socket.end(undefined); } catch {}
  }

  const authDir = path.join(AUTH_BASE, userId);
  fs.mkdirSync(authDir, { recursive: true });

  // Clear old auth state for fresh start
  try {
    const files = fs.readdirSync(authDir);
    for (const f of files) fs.unlinkSync(path.join(authDir, f));
  } catch {}

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const usePairingCode = !!phoneNumber;

  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const session = sessions.get(userId);
        if (session?.pairingCode) {
          resolve({ pairingCode: session.pairingCode, status: "qr_ready" });
        } else if (session?.qrDataUrl) {
          resolve({ qrDataUrl: session.qrDataUrl, status: "qr_ready" });
        } else {
          resolve({ status: "timeout", error: "Connection timed out — try again" });
        }
      }
    }, 45000);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["Chrome", "Chrome", "130.0"],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      logger: {
        level: "warn",
        info(...args: any[]) { console.log("[WA-info]", ...args); },
        debug() {},
        warn(...args: any[]) { console.log("[WA-warn]", ...args); },
        error(...args: any[]) { console.error("[WA-error]", ...args); },
        trace() {},
        fatal(...args: any[]) { console.error("[WA-fatal]", ...args); },
        child() { return this as any; },
      } as any,
    });

    sessions.set(userId, { socket: sock, qrDataUrl: null, pairingCode: null, status: "connecting" });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      console.log("[WA] connection.update:", JSON.stringify({
        connection, qr: qr ? "present" : "none",
        lastDisconnect: lastDisconnect?.error?.message
      }));

      if (qr && !usePairingCode) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
          const session = sessions.get(userId);
          if (session) { session.qrDataUrl = qrDataUrl; session.status = "qr_ready"; }
          if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ qrDataUrl, status: "qr_ready" }); }
        } catch {}
      }

      // Request pairing code once connected to WA servers
      if (qr && usePairingCode && phoneNumber) {
        try {
          // Clean phone number (remove +, spaces, dashes)
          const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
          console.log("[WA] Requesting pairing code for:", cleanPhone);
          const code = await sock.requestPairingCode(cleanPhone);
          console.log("[WA] Pairing code received:", code);
          const session = sessions.get(userId);
          if (session) { session.pairingCode = code; session.status = "qr_ready"; }
          if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ pairingCode: code, status: "qr_ready" }); }
        } catch (e: any) {
          console.error("[WA] Pairing code error:", e.message);
          // Fall back to QR
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
            const session = sessions.get(userId);
            if (session) { session.qrDataUrl = qrDataUrl; session.status = "qr_ready"; }
            if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ qrDataUrl, status: "qr_ready", error: "Pairing code failed, use QR instead" }); }
          } catch {}
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || "unknown";
        console.log("[WA] Connection closed:", statusCode, reason);
        
        // 515 = Stream Errored — Baileys will auto-reconnect and generate new QR
        // Don't resolve as error, let it retry
        if (statusCode === 515) {
          console.log("[WA] 515 stream error — waiting for auto-reconnect...");
          return;
        }
        
        const session = sessions.get(userId);
        if (session) { session.status = "disconnected"; session.error = reason; session.socket = null; }
        if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ status: "disconnected", error: `Connection failed: ${reason}` }); }
      }

      if (connection === "open") {
        console.log("[WA] Connected successfully for user:", userId);
        const session = sessions.get(userId);
        if (session) { session.status = "connected"; session.error = undefined; }
        if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ status: "connected" }); }
      }
    });
  });
}

export function getSessionStatus(userId: string) {
  const session = sessions.get(userId);
  return {
    status: session?.status || "disconnected",
    qrDataUrl: session?.qrDataUrl || null,
    pairingCode: session?.pairingCode || null,
    connected: session?.status === "connected",
    error: session?.error || null,
  };
}

export function disconnectSession(userId: string) {
  const session = sessions.get(userId);
  if (session?.socket) {
    try { session.socket.end(undefined); } catch {}
    session.socket = null;
    session.status = "disconnected";
  }
}
