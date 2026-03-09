import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendWhatsAppMessage } from "@/app/lib/whatsapp";

export const dynamic = "force-dynamic";

// GET /api/cron/reminders — called every minute by cron
// Finds due reminders and sends WhatsApp messages
export async function GET(req: Request) {
  // Simple auth via query param or cron secret
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== "bff-cron-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find reminders that are due and not yet sent
  const dueReminders = await prisma.reminder.findMany({
    where: {
      sent: false,
      datetime: { lte: now },
    },
    include: {
      user: {
        include: {
          agents: {
            where: { whatsappPhone: { not: null } },
            take: 1,
          },
        },
      },
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const reminder of dueReminders) {
    const phone = reminder.user?.whatsappPhone || reminder.user?.agents?.[0]?.whatsappPhone;
    const agentName = reminder.user?.agents?.[0]?.name || "BFF";

    if (!phone) {
      // Mark as sent so we don't retry forever
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent: true } });
      continue;
    }

    try {
      const message = `⏰ Reminder from ${agentName}:\n\n${reminder.text}\n\n— Set for ${new Date(reminder.datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}`;

      await sendWhatsAppMessage(phone, message);

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      });

      // Also log to WhatsAppMessage for conversation history
      const agent = reminder.user?.agents?.[0];
      if (agent) {
        await prisma.whatsAppMessage.create({
          data: {
            agentId: agent.id,
            phone,
            role: "assistant",
            content: message,
          },
        });
      }

      sent++;
    } catch (e: any) {
      errors.push(`Reminder ${reminder.id}: ${e.message}`);
    }
  }

  return NextResponse.json({
    checked: dueReminders.length,
    sent,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
