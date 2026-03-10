import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; reminderId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { reminderId } = await params;
    const reminder = await prisma.reminder.findFirst({ where: { id: reminderId, userId: user.id } });
    if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    const body = await request.json();
    const updated = await prisma.reminder.update({ where: { id: reminderId }, data: body });
    return NextResponse.json({ reminder: updated });
  } catch (e) {
    console.error("PATCH /api/agents/[id]/reminders/[reminderId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; reminderId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { reminderId } = await params;
    const reminder = await prisma.reminder.findFirst({ where: { id: reminderId, userId: user.id } });
    if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    await prisma.reminder.delete({ where: { id: reminderId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/agents/[id]/reminders/[reminderId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
