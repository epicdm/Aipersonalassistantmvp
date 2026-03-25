/**
 * /api/broadcast — Broadcast shim over the Campaign model
 * The DB uses Campaign with type='broadcast'. This route provides
 * the simplified broadcast API the frontend expects.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list broadcasts for the user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.campaign.findMany({
    where: { userId: user.id, type: "broadcast" },
    orderBy: { createdAt: "desc" },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignEnrollment: true,
    },
  });

  const broadcasts = records.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    message: (r as any).message || "",
    recipientCount: r.CampaignEnrollment?.length || 0,
    sentCount: r.CampaignEnrollment?.filter((e: any) => e.status === "sent").length || 0,
    createdAt: r.createdAt,
    scheduledAt: (r as any).scheduledAt || null,
    agent: r.Agent ? { id: r.Agent.id, name: r.Agent.name } : null,
  }));

  return NextResponse.json({ broadcasts });
}

// POST — create a broadcast draft
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.plan === "free") {
    return NextResponse.json(
      { error: "Broadcasts require a Pro or Business plan. Upgrade to send to multiple contacts.", upgrade: true },
      { status: 403 }
    );
  }

  const { name, message, agentId, scheduledAt } = await req.json();
  if (!name?.trim() || !message?.trim() || !agentId) {
    return NextResponse.json({ error: "name, message, and agentId are required" }, { status: 400 });
  }

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const broadcast = await prisma.campaign.create({
    data: {
      userId: user.id,
      agentId,
      name: name.trim(),
      type: "broadcast",
      status: "draft",
      steps: { create: [{ stepNumber: 1, message: message.trim(), delayMinutes: 0 }] },
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    },
    include: { Agent: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    broadcast: {
      id: broadcast.id,
      name: broadcast.name,
      status: broadcast.status,
      createdAt: broadcast.createdAt,
      agent: broadcast.Agent,
    }
  }, { status: 201 });
}
