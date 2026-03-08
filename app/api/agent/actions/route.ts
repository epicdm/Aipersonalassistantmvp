import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) {
    return NextResponse.json({ actions: [], message: "No agent found" });
  }

  // For now, return recent messages as action log
  const messages = await prisma.message.findMany({
    where: { conversation: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      conversation: { include: { contact: true } },
    },
  });

  const actions = messages.map((m) => ({
    id: m.id,
    timestamp: m.createdAt.toISOString(),
    tool: m.direction === "outbound" ? "send_message" : "receive_message",
    action: {
      contact: m.conversation.contact?.name || "Unknown",
      channel: m.conversation.channel,
      text: m.text.slice(0, 100),
    },
    status: m.status,
  }));

  return NextResponse.json({
    actions,
    agentName: agent.name,
    deployedAt: agent.deployedAt?.toISOString() || null,
  });
}
