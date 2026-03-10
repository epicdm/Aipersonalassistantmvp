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
    const todos = await prisma.todo.findMany({
      where: { agentId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ todos });
  } catch (e) {
    console.error("GET /api/agents/[id]/todos:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: agentId } = await params;
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    const todo = await prisma.todo.create({
      data: { userId: user.id, agentId, text, done: false },
    });
    return NextResponse.json({ todo }, { status: 201 });
  } catch (e) {
    console.error("POST /api/agents/[id]/todos:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
