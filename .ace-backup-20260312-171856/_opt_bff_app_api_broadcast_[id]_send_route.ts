import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "1003873729481088";
const WA_API_URL = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`;

async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/broadcast/[id]/send — trigger sending the broadcast
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.plan === "free") {
    return NextResponse.json({ error: "Broadcasts require a Pro or Business plan.", upgrade: true }, { status: 403 });
  }

  const { id } = await params;
  const broadcast = await prisma.broadcast.findFirst({
    where: { id, userId: user.id },
    include: { recipients: { where: { status: "pending" } } },
  });

  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (broadcast.status === "sending") {
    return NextResponse.json({ error: "Broadcast is already sending" }, { status: 409 });
  }

  if (broadcast.status === "sent") {
    return NextResponse.json({ error: "Broadcast already sent" }, { status: 409 });
  }

  if (broadcast.recipients.length === 0) {
    return NextResponse.json({ error: "No pending recipients" }, { status: 400 });
  }

  // Mark as sending
  await prisma.broadcast.update({ where: { id }, data: { status: "sending" } });

  let sentCount = broadcast.sentCount;
  let failedCount = broadcast.failedCount;

  // Send messages with rate limiting (15ms delay = ~66/sec, well under 80/sec max)
  for (const recipient of broadcast.recipients) {
    const result = await sendWhatsAppMessage(recipient.phone, broadcast.message);

    if (result.success) {
      sentCount++;
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", sentAt: new Date() },
      });
    } else {
      failedCount++;
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", error: result.error },
      });
    }

    // Rate limit: 15ms delay between sends
    await sleep(15);
  }

  // Mark broadcast complete
  const allFailed = sentCount === 0 && failedCount > 0;
  await prisma.broadcast.update({
    where: { id },
    data: {
      status: allFailed ? "failed" : "sent",
      sentCount,
      failedCount,
      sentAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, sentCount, failedCount });
}
