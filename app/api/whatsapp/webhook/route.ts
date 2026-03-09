import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendWhatsAppMessage } from "@/app/lib/whatsapp";
import { getAgentResponse, getWelcomeMessage } from "@/app/lib/agent-chat";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "epic-wa-2026";

// ─── GET: Webhook verification ────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WA Webhook] Verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: Inbound messages ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract message data from WhatsApp Cloud API payload
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Ignore non-message events (status updates etc.)
    if (!value?.messages?.length) {
      return NextResponse.json({ ok: true });
    }

    const msg = value.messages[0];
    const from: string = msg.from; // phone number without +
    const messageText: string = msg.text?.body?.trim() || "";

    if (!messageText) {
      return NextResponse.json({ ok: true });
    }

    console.log(`[WA Webhook] Message from ${from}: ${messageText}`);

    // ── Activation flow: message contains BFF-xxxxxxxxxx code anywhere ──
    const codeMatch = messageText.match(/BFF-[A-Z0-9]{10}/i);
    if (codeMatch) {
      const code = codeMatch[0].toUpperCase();
      const agent = await prisma.agent.findUnique({
        where: { activationCode: code },
        include: { user: true },
      });

      if (!agent) {
        await sendWhatsAppMessage(
          from,
          "Hmm, that activation code doesn't match any agent. Double-check and try again!"
        );
        return NextResponse.json({ ok: true });
      }

      if (agent.activatedAt) {
        // Already activated — just route normally
        await handleChat(from, messageText, agent);
        return NextResponse.json({ ok: true });
      }

      // Bind WhatsApp number and activate
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          whatsappPhone: from,
          activatedAt: new Date(),
          status: "active",
        },
      });

      // Also store on user record (first agent wins)
      if (!agent.user.whatsappPhone) {
        await prisma.user.update({
          where: { id: agent.userId },
          data: { whatsappPhone: from },
        });
      }

      // Send welcome message
      const welcome = getWelcomeMessage(agent as Parameters<typeof getWelcomeMessage>[0]);
      await sendWhatsAppMessage(from, welcome);

      // Store welcome in history
      await prisma.whatsAppMessage.create({
        data: {
          agentId: agent.id,
          phone: from,
          role: "assistant",
          content: welcome,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // ── Regular chat: look up agent by phone ──────────────────
    const agent = await prisma.agent.findFirst({
      where: { whatsappPhone: from },
    });

    if (!agent) {
      // Unknown sender — prompt them to activate
      await sendWhatsAppMessage(
        from,
        "Hey! I don't recognize your number yet. Please use the activation link from the BFF app to connect. 🤖"
      );
      return NextResponse.json({ ok: true });
    }

    await handleChat(from, messageText, agent);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WA Webhook] Error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to WA
  }
}

// ─── Chat handler ─────────────────────────────────────────────
async function handleChat(
  from: string,
  userMessage: string,
  agent: {
    id: string;
    name: string;
    template: string | null;
    purpose: string | null;
    tone: string | null;
    config: unknown;
  }
) {
  // Store inbound message
  await prisma.whatsAppMessage.create({
    data: {
      agentId: agent.id,
      phone: from,
      role: "user",
      content: userMessage,
    },
  });

  // Fetch conversation history (last 10)
  const historyRecords = await prisma.whatsAppMessage.findMany({
    where: { agentId: agent.id, phone: from },
    orderBy: { timestamp: "desc" },
    take: 11, // +1 to exclude the message we just inserted
    skip: 1,
  });

  const history = historyRecords
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Call DeepSeek
  const reply = await getAgentResponse(
    agent as Parameters<typeof getAgentResponse>[0],
    history,
    userMessage
  );

  // Send reply
  await sendWhatsAppMessage(from, reply);

  // Store outbound message
  await prisma.whatsAppMessage.create({
    data: {
      agentId: agent.id,
      phone: from,
      role: "assistant",
      content: reply,
    },
  });
}
