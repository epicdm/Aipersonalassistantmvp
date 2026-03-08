import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { getMaxAgents } from "@/app/lib/templates";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const all = url.searchParams.get("all");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (all) {
    const agents = await prisma.agent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ agents, plan: dbUser?.plan || "free" });
  }

  // Backwards compat: return single agent
  const agent = await prisma.agent.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ agent });
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // CREATE new agent
  if (body.name && !body._update) {
    const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    const agentCount = await prisma.agent.count({ where: { userId: sessionUser.id } });
    const maxAgents = getMaxAgents(dbUser?.plan || "free");

    if (agentCount >= maxAgents) {
      return NextResponse.json({
        error: `Your ${dbUser?.plan || "free"} plan allows ${maxAgents} agent${maxAgents > 1 ? "s" : ""}. Upgrade to add more.`,
        upgrade: true,
      }, { status: 403 });
    }

    const agent = await prisma.agent.create({
      data: {
        userId: sessionUser.id,
        name: body.name,
        template: body.template || null,
        purpose: body.config?.purpose || body.purpose || null,
        tone: body.config?.tone || null,
        tools: JSON.stringify(body.config?.tools || body.tools || []),
        approvalMode: body.config?.approvalMode || "confirm",
        config: body.config || null,
        guardrails: body.guardrails || null,
        status: "active",
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  }

  // UPDATE existing agent
  const agentId = body.agentId;
  const where = agentId
    ? { id: agentId, userId: sessionUser.id }
    : undefined;

  const agent = agentId
    ? await prisma.agent.findFirst({ where })
    : await prisma.agent.findFirst({ where: { userId: sessionUser.id } });

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const updateData: any = {};
  if (body.config) {
    if (body.config.name) updateData.name = body.config.name;
    if (body.config.purpose) updateData.purpose = body.config.purpose;
    if (body.config.template) updateData.template = body.config.template;
    if (body.config.tone) updateData.tone = body.config.tone;
    if (body.config.tools) updateData.tools = JSON.stringify(body.config.tools);
    if (body.config.approvalMode) updateData.approvalMode = body.config.approvalMode;
  }
  if (body.whatsappStatus !== undefined) updateData.whatsappStatus = body.whatsappStatus;
  if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
  if (body.phoneStatus !== undefined) updateData.phoneStatus = body.phoneStatus;
  if (body.guardrails !== undefined) updateData.guardrails = body.guardrails;
  if (body.config !== undefined) updateData.config = body.config;
  if (body.status !== undefined) updateData.status = body.status;

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: updateData,
  });

  return NextResponse.json({ agent: updated });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await req.json();

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  await prisma.agent.delete({ where: { id: agent.id } });
  return NextResponse.json({ ok: true });
}
