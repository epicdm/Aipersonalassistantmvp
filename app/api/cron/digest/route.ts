import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendWhatsAppMessage } from "@/app/lib/whatsapp";
import { getTodayEvents, formatEventsForAgent, getGoogleToken } from "@/app/lib/google";

export const dynamic = "force-dynamic";

// GET /api/cron/digest — daily morning digest via WhatsApp (run at 7 AM)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== "bff-cron-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const threeDays = new Date(today);
  threeDays.setDate(threeDays.getDate() + 3);

  // Get all active agents with WhatsApp connected
  const agents = await prisma.agent.findMany({
    where: {
      whatsappPhone: { not: null },
      activatedAt: { not: null },
    },
    include: { user: true },
  });

  let sent = 0;

  for (const agent of agents) {
    const phone = agent.whatsappPhone!;
    const userId = agent.userId;

    try {
      // Gather today's data
      const [reminders, bills, todos] = await Promise.all([
        prisma.reminder.findMany({
          where: { userId, sent: false, datetime: { gte: today, lt: tomorrow } },
        }),
        prisma.bill.findMany({
          where: { userId, paid: false, dueDate: { gte: today, lte: threeDays } },
        }),
        prisma.todo.findMany({
          where: { userId, done: false },
        }),
      ]);

      // Google Calendar events
      let calendarSection = "";
      if (agent.user?.clerkId) {
        const hasGoogle = await getGoogleToken(agent.user.clerkId);
        if (hasGoogle) {
          const events = await getTodayEvents(agent.user.clerkId);
          if (events.length > 0) {
            calendarSection = `\n\n📅 Today's Schedule:\n${formatEventsForAgent(events)}`;
          }
        }
      }

      // Build digest message
      const parts: string[] = [];
      parts.push(`☀️ Good morning! Here's your daily digest from ${agent.name}:`);

      if (calendarSection) parts.push(calendarSection);

      if (reminders.length > 0) {
        parts.push(`\n\n⏰ Reminders today (${reminders.length}):`);
        for (const r of reminders) {
          const time = new Date(r.datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          parts.push(`• ${time} — ${r.text}`);
        }
      }

      if (bills.length > 0) {
        const total = bills.reduce((sum, b) => sum + b.amount, 0);
        parts.push(`\n\n💸 Bills due soon (${bills.length}) — $${total.toFixed(2)} total:`);
        for (const b of bills) {
          const due = new Date(b.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          parts.push(`• ${b.name}: $${b.amount.toFixed(2)} (${due})`);
        }
      }

      if (todos.length > 0) {
        parts.push(`\n\n✅ Open to-dos (${todos.length}):`);
        for (const t of todos.slice(0, 5)) {
          parts.push(`• ${t.text}`);
        }
        if (todos.length > 5) parts.push(`  ...and ${todos.length - 5} more`);
      }

      // Only send if there's something to report
      if (reminders.length === 0 && bills.length === 0 && todos.length === 0 && !calendarSection) {
        parts.push(`\n\nNothing on the radar today! 🎉 Enjoy your day.`);
      }

      parts.push(`\n\nHave a great day! 💪`);

      const message = parts.join("\n");
      await sendWhatsAppMessage(phone, message);

      // Log to conversation
      await prisma.whatsAppMessage.create({
        data: {
          agentId: agent.id,
          phone,
          role: "assistant",
          content: message,
        },
      });

      sent++;
    } catch (e) {
      console.error(`[Digest] Error for agent ${agent.id}:`, e);
    }
  }

  return NextResponse.json({ agents: agents.length, sent });
}
