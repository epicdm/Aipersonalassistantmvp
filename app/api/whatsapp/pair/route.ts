import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let phoneNumber: string | undefined;
    try {
      const body = await req.json();
      phoneNumber = body.phoneNumber;
    } catch {}

    const { startWhatsAppSession } = await import("@/app/lib/whatsapp-session");
    const result = await startWhatsAppSession(user.id, phoneNumber);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("WhatsApp pairing error:", e);
    return NextResponse.json({ error: e.message || "Failed to start WhatsApp session" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { getSessionStatus } = await import("@/app/lib/whatsapp-session");
    const status = getSessionStatus(user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ status: "disconnected", connected: false });
  }
}
