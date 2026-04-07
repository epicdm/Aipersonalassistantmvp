import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bff_jwt_secret_epic_2026_secure_random_string_xyz789";

declare global {
  var _bffOtpStore: Map<string, { code: string; expiresAt: number }> | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ error: "Phone and code required" }, { status: 400 });

    const toE164 = (raw: string) => {
      let n = raw.replace(/[\s\-\(\)\.]/g, "");
      if (n.startsWith("+")) return n;
      const digits = n.replace(/\D/g, "");
      if (digits.length <= 7) return `+1767${digits}`;
      if (digits.length === 10) return `+1${digits}`;
      return `+${digits}`;
    };

    const e164 = toE164(phone);
    // Digits-only ID — matches how WhatsApp webhook creates users
    const userId = e164.replace("+", "");

    const stored = global._bffOtpStore?.get(e164);
    if (!stored) return NextResponse.json({ error: "No code found. Request a new one." }, { status: 400 });
    if (Date.now() > stored.expiresAt) {
      global._bffOtpStore?.delete(e164);
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }
    if (stored.code !== code.trim()) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    global._bffOtpStore?.delete(e164);

    // Session user with digits-only id (matches WhatsApp-created users & agents)
    const user = { id: userId, email: `${userId}@bff.epic.dm` };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

    const res = NextResponse.json({ success: true, user });
    res.cookies.set("session", token, {
      httpOnly: true, secure: true, sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, path: "/",
    });
    return res;
  } catch (err: any) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}