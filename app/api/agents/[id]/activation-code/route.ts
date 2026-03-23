import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const agent = await prisma.agent.findFirst({
    where: { id, userId: user.id },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const activationCode =
    "BFF-" +
    crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase();

  await prisma.agent.update({
    where: { id },
    data: {
      activationCode,
      activationCodeCreatedAt: new Date(),
      ownerPhone: null,
    },
  });

  return NextResponse.json({ activationCode });
}
