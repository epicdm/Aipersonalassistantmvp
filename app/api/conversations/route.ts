import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      agent: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, conversationId, message, channel, action } = await req.json();

  // Get agent for approval mode
  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  const approvalMode = agent?.approvalMode || "confirm";

  // Approve pending message
  if (action === "approve" && conversationId) {
    const msg = await prisma.message.findFirst({
      where: { conversationId, status: "pending_approval", conversation: { userId: user.id } },
    });
    if (!msg) return NextResponse.json({ error: "No pending message" }, { status: 400 });

    const updated = await prisma.message.update({
      where: { id: msg.id },
      data: { status: "sent", approvedAt: new Date(), sentAt: new Date() },
    });

    return NextResponse.json({ messageSent: true, message: updated });
  }

  // New message
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: user.id } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!agent) return NextResponse.json({ error: "No agent" }, { status: 404 });

  // Find or create conversation
  let conv = await prisma.conversation.findFirst({
    where: { contactId, userId: user.id, agentId: agent.id, status: "active" },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        userId: user.id,
        agentId: agent.id,
        contactId,
        channel: channel || (contact.phone ? "whatsapp" : "email"),
      },
    });
  }

  const msgStatus = approvalMode === "auto" || action === "send" ? "sent" : "pending_approval";

  const newMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: "outbound",
      text: message.trim(),
      status: msgStatus,
      sentAt: msgStatus === "sent" ? new Date() : null,
    },
  });

  return NextResponse.json({
    conversation: conv,
    contact,
    message: newMsg,
    needsApproval: msgStatus === "pending_approval",
  });
}
