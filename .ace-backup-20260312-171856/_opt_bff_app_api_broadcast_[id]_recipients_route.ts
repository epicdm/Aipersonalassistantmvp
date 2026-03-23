import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

// POST /api/broadcast/[id]/recipients — add phone numbers to a broadcast
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, userId: user.id } });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (broadcast.status !== "draft") {
    return NextResponse.json({ error: "Cannot modify recipients after broadcast has started" }, { status: 400 });
  }

  const body = await req.json();
  const phones: string[] = Array.isArray(body.phones) ? body.phones : [];
  const cleanPhones = phones.map((p) => p.trim()).filter(Boolean);

  if (cleanPhones.length === 0) {
    return NextResponse.json({ error: "No valid phone numbers provided" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const maxRecipients = dbUser?.plan === "pro" ? 500 : Infinity;
  const currentCount = await prisma.broadcastRecipient.count({ where: { broadcastId: id } });

  if (currentCount + cleanPhones.length > maxRecipients) {
    return NextResponse.json(
      { error: `Pro plan allows up to 500 recipients per broadcast.`, upgrade: true },
      { status: 403 }
    );
  }

  await prisma.broadcastRecipient.createMany({
    data: cleanPhones.map((phone) => ({ broadcastId: id, phone, status: "pending" })),
    skipDuplicates: true,
  });

  const updatedCount = await prisma.broadcastRecipient.count({ where: { broadcastId: id } });
  await prisma.broadcast.update({ where: { id }, data: { recipientCount: updatedCount } });

  return NextResponse.json({ added: cleanPhones.length, total: updatedCount });
}
