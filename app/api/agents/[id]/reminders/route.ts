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
    const reminders = await prisma.reminder.findMany({
      where: { agentId, userId: user.id },
      orderBy: { datetime: "asc" },
    });
    return NextResponse.json({ reminders });
  } catch (e) {
    console.error("GET /api/agents/[id]/reminders:", e);
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
    const { text, datetime, recurring } = await request.json();
    if (!text || !datetime) return NextResponse.json({ error: "text and datetime required" }, { status: 400 });
    const reminder = await prisma.reminder.create({
      data: { userId: user.id, agentId, text, datetime: new Date(datetime), recurring: recurring || null, sent: false },
    });
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (e) {
    console.error("POST /api/agents/[id]/reminders:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
