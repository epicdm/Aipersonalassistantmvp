import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  const agentIds = agents.map((a) => a.id);
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  if (agentIds.length === 0) return NextResponse.json([]);

  const allMessages = await prisma.whatsAppMessage.findMany({
    where: { agentId: { in: agentIds }, sessionType: "customer" },
    orderBy: { timestamp: "desc" },
    take: 2000,
  });

  // Group by agentId:phone
  const threadMap = new Map<string, typeof allMessages>();
  for (const msg of allMessages) {
    const key = `${msg.agentId}:${msg.phone}`;
    if (!threadMap.has(key)) threadMap.set(key, []);
    threadMap.get(key)!.push(msg);
  }

  const phones = [...new Set(allMessages.map((m) => m.phone))];
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id, phone: { in: phones } },
  });
  const contactMap = Object.fromEntries(contacts.map((c) => [c.phone ?? "", c]));

  const conversations = [...threadMap.entries()].map(([key, msgs]) => {
    const colonIdx = key.indexOf(":");
    const agentId = key.slice(0, colonIdx);
    const phone = key.slice(colonIdx + 1);
    const contact = contactMap[phone];
    const sorted = [...msgs].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      id: key,
      agentId,
      agent: agentMap[agentId] ? { name: agentMap[agentId].name } : undefined,
      contact: contact
        ? { name: contact.name, phone: contact.phone }
        : { name: undefined, phone },
      contactId: contact?.id || phone,
      status: "active",
      updatedAt:
        sorted[sorted.length - 1]?.timestamp?.toISOString() ||
        new Date().toISOString(),
      messages: sorted.map((m) => ({
        id: m.id,
        direction: m.role === "user" ? "inbound" : "outbound",
        text: m.content,
        createdAt: m.timestamp.toISOString(),
      })),
    };
  });

  conversations.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json(conversations);
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
