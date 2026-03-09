import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/history?agentId=xxx — returns last 20 messages
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.whatsAppMessage.findMany({
    where: { agentId },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  // Return in chronological order
  return NextResponse.json({ messages: messages.reverse() });
}
