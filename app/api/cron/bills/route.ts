import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendWhatsAppMessage } from "@/app/lib/whatsapp";

export const dynamic = "force-dynamic";

// GET /api/cron/bills — called daily
// Sends WhatsApp reminders for bills due within 3 days
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== "bff-cron-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find unpaid bills due within 3 days
  const dueBills = await prisma.bill.findMany({
    where: {
      paid: false,
      dueDate: {
        gte: now,
        lte: threeDaysOut,
      },
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

  for (const bill of dueBills) {
    const phone = bill.user?.whatsappPhone || bill.user?.agents?.[0]?.whatsappPhone;
    const agentName = bill.user?.agents?.[0]?.name || "BFF";

    if (!phone) continue;

    try {
      const dueDate = new Date(bill.dueDate);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const urgency = daysUntil <= 1 ? "🔴 TOMORROW" : daysUntil <= 2 ? "🟡 In 2 days" : "📅 In 3 days";

      const message = `💸 Bill reminder from ${agentName}:\n\n${urgency}: ${bill.name} — $${bill.amount.toFixed(2)}\nDue: ${dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}\n\nReply "paid" to mark it done ✅`;

      await sendWhatsAppMessage(phone, message);

      const agent = bill.user?.agents?.[0];
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
    } catch (e) {
      console.error(`[Bill cron] Error for bill ${bill.id}:`, e);
    }
  }

  // Also check for overdue bills
  const overdueBills = await prisma.bill.findMany({
    where: {
      paid: false,
      dueDate: { lt: now },
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

  for (const bill of overdueBills) {
    const phone = bill.user?.whatsappPhone || bill.user?.agents?.[0]?.whatsappPhone;
    const agentName = bill.user?.agents?.[0]?.name || "BFF";
    if (!phone) continue;

    try {
      const message = `🔴 Overdue bill from ${agentName}:\n\n${bill.name} — $${bill.amount.toFixed(2)} was due ${new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}\n\nReply "paid" to mark it done ✅`;
      await sendWhatsAppMessage(phone, message);
      sent++;
    } catch (e) {
      console.error(`[Bill cron] Overdue error:`, e);
    }
  }

  return NextResponse.json({ dueBills: dueBills.length, overdue: overdueBills.length, sent });
}
