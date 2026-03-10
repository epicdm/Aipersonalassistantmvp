import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: agentId } = await params;
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const bills = await prisma.bill.findMany({
      where: { agentId, userId: user.id },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json({ bills });
  } catch (e) {
    console.error("GET /api/agents/[id]/bills:", e);
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
    const { name, amount, dueDate, recurring } = await request.json();
    if (!name || !amount || !dueDate) return NextResponse.json({ error: "name, amount, dueDate required" }, { status: 400 });
    const bill = await prisma.bill.create({
      data: { userId: user.id, agentId, name, amount: parseFloat(amount), dueDate: new Date(dueDate), recurring: recurring || null, paid: false },
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (e) {
    console.error("POST /api/agents/[id]/bills:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
