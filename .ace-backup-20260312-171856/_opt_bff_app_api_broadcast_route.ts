import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

// GET /api/broadcast — list all broadcasts for authenticated user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const broadcasts = await prisma.broadcast.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ broadcasts });
}

// POST /api/broadcast — create a new broadcast (draft)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.plan === "free") {
    return NextResponse.json(
      { error: "Broadcasts require a Pro or Business plan.", upgrade: true },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, message, agentId, phones, scheduledAt } = body;

  if (!name || !message || !agentId) {
    return NextResponse.json({ error: "name, message, and agentId are required" }, { status: 400 });
  }

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Parse recipients
  const phoneList: string[] = Array.isArray(phones) ? phones : [];
  const cleanPhones = phoneList.map((p) => p.trim()).filter(Boolean);

  // Plan limits
  const maxRecipients = dbUser?.plan === "pro" ? 500 : Infinity;
  if (cleanPhones.length > maxRecipients) {
    return NextResponse.json(
      { error: `Pro plan allows up to 500 recipients per broadcast.`, upgrade: true },
      { status: 403 }
    );
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      userId: user.id,
      agentId,
      name,
      message,
      status: "draft",
      recipientCount: cleanPhones.length,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      recipients: {
        create: cleanPhones.map((phone) => ({ phone, status: "pending" })),
      },
    },
    include: { recipients: true },
  });

  return NextResponse.json({ broadcast }, { status: 201 });
}
