import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { sendFreeTierMessage } from "@/app/lib/runtime/free-tier";
import { generateSoulMd } from "@/app/lib/soul-generator";

import { getUserHistory, setUserHistory, popBargePending } from "@/app/lib/chat-store";

const GATEWAY_URL = "http://127.0.0.1:18789";
const GATEWAY_TOKEN = "341e65605497a047f70ff20e7c41c7d0ef515d10415e3795";

/**
 * POST /api/chat
 * Send a message to the user's AI agent.
 * Agent knows about contacts, can draft outbound messages,
 * and respects the approval mode.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Agent not configured" }, { status: 404 });

  const config = agent.config || {};
  const contacts = (db.data!.contacts || []).filter((c) => c.userId === user.id);
  const conversations = (db.data!.conversations || []).filter((c) => c.userId === user.id);

  // Build context-rich system prompt
  const soul = generateSoulMd(config, user.name || user.email);
  const approvalMode = config.approvalMode || "confirm";

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
    contactsContext += "\n\nYou can compose messages to these contacts on behalf of the user.";
  }

  let pendingContext = "";
  const pending = conversations.filter((conv) =>
    conv.messages.some((m) => m.status === "pending_approval")
  );
  if (pending.length > 0) {
    pendingContext = "\n\n## Pending Messages\n\n";
    pendingContext += pending
      .map((conv) => {
        const contact = contacts.find((c) => c.id === conv.contactId);
        const msg = conv.messages.find((m) => m.status === "pending_approval");
        return `- To **${contact?.name || "Unknown"}**: "${msg?.text}" (awaiting approval)`;
      })
      .join("\n");
  }

  const messagingInstructions = `

## Outbound Messaging

When the user asks you to message, contact, or follow up with someone:

1. Find the contact in the contacts list above
2. Compose an appropriate message based on the user's instructions
3. Present the draft in this exact format:

📤 **Draft Message**
**To:** [Contact Name] via [WhatsApp/Email]
**Message:**
> [the actual message text]

[SEND_TO:contact_id] — (this tag triggers the send flow)

Then ask: "Shall I send this?"

If the user approves (says yes, send it, go ahead, etc.), respond with:
✅ Message queued for delivery to [Contact Name].

If the contact is not in the contacts list, say so and suggest adding them first.

${approvalMode === "auto" ? "In auto mode, you can send immediately without asking." : ""}
${approvalMode === "notify" ? "Send the message and notify the user what you did." : ""}`;

  const systemPrompt = soul + contactsContext + pendingContext + messagingInstructions;

  // Check for any barge-in messages from admin
  const bargeMessages = popBargePending(user.id);

  // Get or initialize conversation history
  let history = getUserHistory(user.id);
  history.push({ role: "user", content: message.trim() });

  // Keep last 20 messages for context
  if (history.length > 20) history = history.slice(-20);

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
        ],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gateway: ${res.status} ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "I couldn't process that. Please try again.";

    // Save assistant reply to history
    history.push({ role: "assistant", content: reply });
    setUserHistory(user.id, history);

    // Check if reply contains a SEND_TO tag — auto-create conversation draft
    const sendMatch = reply.match(/\[SEND_TO:(\w+)\]/);
    let draftCreated = false;
    if (sendMatch) {
      const contactId = sendMatch[1];
      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        // Extract the message from the > blockquote
        const msgMatch = reply.match(/>\s*(.+?)(?:\n\n|\[SEND_TO)/s);
        if (msgMatch) {
          const draftText = msgMatch[1].trim();

          // Create conversation with draft
          let conv = db.data!.conversations.find(
            (c) => c.contactId === contactId && c.userId === user.id && c.status === "active"
          );
          if (!conv) {
            conv = {
              id: Math.random().toString(36).slice(2, 10),
              userId: user.id,
              contactId,
              channel: contact.phone ? "whatsapp" : "email",
              messages: [],
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            db.data!.conversations.push(conv);
          }

          conv.messages.push({
            id: Math.random().toString(36).slice(2, 10),
            direction: "outbound",
            text: draftText,
            status: approvalMode === "auto" ? "sent" : "pending_approval",
            timestamp: new Date().toISOString(),
          });
          conv.updatedAt = new Date().toISOString();
          await saveDb();
          draftCreated = true;
        }
      }
    }

    // Clean the SEND_TO tag from the visible reply
    const cleanReply = reply.replace(/\[SEND_TO:\w+\]\s*—?\s*\(.*?\)/g, "").trim();

    return NextResponse.json({
      reply: cleanReply,
      draftCreated,
      bargeMessages: bargeMessages.length > 0 ? bargeMessages : undefined,
      usage: { tier: "free" },
    });
  } catch (err: any) {
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please try again.",
      error: err.message,
    });
  }
}
