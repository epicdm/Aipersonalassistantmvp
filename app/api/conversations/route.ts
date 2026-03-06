import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { randomUUID } from "crypto";

/**
 * GET /api/conversations — List user's active conversations
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const conversations = (db.data!.conversations || [])
    .filter((c) => c.userId === user.id)
    .map((conv) => {
      const contact = db.data!.contacts.find((c) => c.id === conv.contactId);
      return { ...conv, contact };
    });

  return NextResponse.json({ conversations });
}

/**
 * POST /api/conversations — Create a new conversation / send a message
 *
 * Body: { contactId, message, channel?, action? }
 * 
 * action = "draft" (default) → creates draft for approval
 * action = "send" → sends immediately (if approval mode allows)
 * action = "approve" → approves a pending draft
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, conversationId, message, channel, action } = await req.json();

  await loadDb();

  // Get agent config for approval mode
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  const approvalMode = agent?.config?.approvalMode || "confirm";

  // If approving an existing draft
  if (action === "approve" && conversationId) {
    const conv = db.data!.conversations.find(
      (c) => c.id === conversationId && c.userId === user.id
    );
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const pendingMsg = conv.messages.find((m) => m.status === "pending_approval");
    if (!pendingMsg) return NextResponse.json({ error: "No pending message" }, { status: 400 });

    // Mark as sent (in production, this triggers actual WhatsApp/email delivery)
    pendingMsg.status = "sent";
    pendingMsg.approvedAt = new Date().toISOString();
    pendingMsg.sentAt = new Date().toISOString();
    conv.updatedAt = new Date().toISOString();

    // TODO: Actually send via WhatsApp/email here
    // await sendViaWhatsApp(contact.phone, pendingMsg.text);

    await saveDb();
    return NextResponse.json({ conversation: conv, messageSent: true });
  }

  // Creating a new message
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  const contact = db.data!.contacts.find((c) => c.id === contactId && c.userId === user.id);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // Find or create conversation
  let conv = db.data!.conversations.find(
    (c) => c.contactId === contactId && c.userId === user.id && c.status === "active"
  );

  if (!conv) {
    conv = {
      id: randomUUID().slice(0, 8),
      userId: user.id,
      contactId,
      channel: channel || (contact.phone ? "whatsapp" : "email"),
      messages: [],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.data!.conversations.push(conv);
  }

  // Determine message status based on approval mode
  let msgStatus: "draft" | "pending_approval" | "sent" = "pending_approval";
  if (approvalMode === "auto" || action === "send") {
    msgStatus = "sent";
  }

  const newMsg = {
    id: randomUUID().slice(0, 8),
    direction: "outbound" as const,
    text: message.trim(),
    status: msgStatus,
    sentAt: msgStatus === "sent" ? new Date().toISOString() : undefined,
    timestamp: new Date().toISOString(),
  };

  conv.messages.push(newMsg);
  conv.updatedAt = new Date().toISOString();

  await saveDb();

  // If auto-send, trigger delivery
  if (msgStatus === "sent") {
    // TODO: Actually send via WhatsApp/email
    // await sendViaWhatsApp(contact.phone, newMsg.text);
  }

  return NextResponse.json({
    conversation: { ...conv, contact },
    message: newMsg,
    needsApproval: msgStatus === "pending_approval",
  });
}
