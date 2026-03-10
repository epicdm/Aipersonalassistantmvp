import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { todoId } = await params;
    const todo = await prisma.todo.findFirst({ where: { id: todoId, userId: user.id } });
    if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    const body = await request.json();
    const updated = await prisma.todo.update({ where: { id: todoId }, data: body });
    return NextResponse.json({ todo: updated });
  } catch (e) {
    console.error("PATCH /api/agents/[id]/todos/[todoId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { todoId } = await params;
    const todo = await prisma.todo.findFirst({ where: { id: todoId, userId: user.id } });
    if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    await prisma.todo.delete({ where: { id: todoId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/agents/[id]/todos/[todoId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
