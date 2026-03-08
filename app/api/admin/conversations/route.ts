import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // For now, users can only see their own conversations (admin = self)
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      agent: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}
