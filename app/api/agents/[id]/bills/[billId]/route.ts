import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; billId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { billId } = await params;
    const bill = await prisma.bill.findFirst({ where: { id: billId, userId: user.id } });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const body = await request.json();
    const updated = await prisma.bill.update({ where: { id: billId }, data: body });
    return NextResponse.json({ bill: updated });
  } catch (e) {
    console.error("PATCH /api/agents/[id]/bills/[billId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; billId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { billId } = await params;
    const bill = await prisma.bill.findFirst({ where: { id: billId, userId: user.id } });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    await prisma.bill.delete({ where: { id: billId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/agents/[id]/bills/[billId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
