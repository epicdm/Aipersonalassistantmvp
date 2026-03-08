import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { generateSoulMd } from "@/app/lib/soul-generator";
import { getUserHistory, setUserHistory, popBargePending } from "@/app/lib/chat-store";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// Use DeepSeek directly (no gateway dependency on Vercel)
async function callLLM(messages: any[]) {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "I couldn't process that. Please try again.";
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not configured" }, { status: 404 });

  const config = (agent.config as any) || {};
  const contacts = await prisma.contact.findMany({ where: { userId: user.id } });

  // Build system prompt
  const soul = agent.soul || generateSoulMd(config, user.name || user.email);
  const approvalMode = agent.approvalMode || "confirm";

  let contactsContext = "";
  if (contacts.length > 0) {
    contactsContext = "\n\n## Your Contacts\n\n";
    contactsContext += contacts
      .map((c) => {
        let line = `- **${c.name}**`;
        if (c.phone) line += ` | Phone: ${c.phone}`;
        if (c.email) line += ` | Email: ${c.email}`;
        if (c.notes) line += ` | Notes: ${c.notes}`;
        return line;
      })
      .join("\n");
  }

  const messagingInstructions = `

## Outbound Messaging

When the user asks you to message someone:
1. Find the contact in the contacts list
2. Compose an appropriate message
3. Present the draft clearly
4. Ask for confirmation before sending

${approvalMode === "auto" ? "In auto mode, you can send immediately without asking." : ""}`;

  const systemPrompt = soul + contactsContext + messagingInstructions;

  // Get conversation history
  let history = getUserHistory(user.id);
  history.push({ role: "user", content: message.trim() });
  if (history.length > 20) history = history.slice(-20);

  try {
    const reply = await callLLM([
      { role: "system", content: systemPrompt },
      ...history,
    ]);

    history.push({ role: "assistant", content: reply });
    setUserHistory(user.id, history);

    const bargeMessages = popBargePending(user.id);

    return NextResponse.json({
      reply,
      bargeMessages: bargeMessages.length > 0 ? bargeMessages : undefined,
      usage: { tier: "free" },
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please try again.",
      error: err.message,
    });
  }
}
