import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/knowledge — list all knowledge sources for the user's agents
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const agentIds = agents.map(a => a.id);

  const sources = await prisma.knowledgeSource.findMany({
    where: { agentId: { in: agentIds } },
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { name: true } } },
  });

  return NextResponse.json({ sources });
}

// POST /api/knowledge — add a knowledge source
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, type, name, content, url } = await req.json();
  if (!agentId || !type || !name) {
    return NextResponse.json({ error: "agentId, type, and name required" }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const source = await prisma.knowledgeSource.create({
    data: {
      agentId,
      type,
      name,
      content: content || null,
      url: url || null,
      embedStatus: "pending",
    },
    include: { agent: { select: { name: true } } },
  });

  return NextResponse.json({ source }, { status: 201 });
}

// DELETE /api/knowledge?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const agents = await prisma.agent.findMany({ where: { userId: user.id }, select: { id: true } });
  const agentIds = agents.map(a => a.id);

  const source = await prisma.knowledgeSource.findFirst({ where: { id, agentId: { in: agentIds } } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.knowledgeSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
