import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: agentId } = await params;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    // Get all conversations for this agent, with their messages and contact phone
    const conversations = await prisma.conversation.findMany({
      where: { agentId, userId: user.id },
      include: {
        contact: { select: { phone: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Flatten into WhatsAppMessage shape expected by dashboard
    const messages = conversations.flatMap((conv) =>
      conv.messages.map((m) => ({
        id: m.id,
        phone: conv.contact.phone,
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.text,
        timestamp: m.createdAt.toISOString(),
      }))
    );

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("GET /api/agents/[id]/messages:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
