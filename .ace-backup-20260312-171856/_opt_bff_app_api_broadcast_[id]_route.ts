import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

// GET /api/broadcast/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const broadcast = await prisma.broadcast.findFirst({
    where: { id, userId: user.id },
    include: {
      agent: { select: { id: true, name: true } },
      recipients: { orderBy: { phone: "asc" } },
    },
  });

  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ broadcast });
}

// DELETE /api/broadcast/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, userId: user.id } });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.broadcast.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
