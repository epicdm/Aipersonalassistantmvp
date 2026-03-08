import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { generateSoulMd } from "@/app/lib/soul-generator";
import { launchAgent, getAgentStatus, stopAgent } from "@/app/lib/runtime/agent-launcher";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = (agent.config as any) || {};

  if (!config.name?.trim()) {
    return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
  }
  if (!config.purpose?.trim() && !agent.purpose?.trim()) {
    return NextResponse.json({ error: "Agent purpose is required" }, { status: 400 });
  }

  const soul = generateSoulMd(config, user.name || user.email);

  const result = await launchAgent(
    { id: user.id, email: user.email, name: user.name },
    config,
    "starter"
  );

  if (result.status === "error") {
    return NextResponse.json({ error: `Deployment failed: ${result.error}` }, { status: 500 });
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      soul,
      status: "active",
      deployedAt: new Date(),
      config: { ...config, deployment: { agentId: result.agentId, status: result.status, port: result.port, workspace: result.workspace } },
    },
  });

  return NextResponse.json({ success: true, deployment: result, soul });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = getAgentStatus(user.id);
  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });

  return NextResponse.json({
    ...status,
    deployment: (agent?.config as any)?.deployment || null,
    agentName: (agent?.config as any)?.name || agent?.name || null,
  });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await stopAgent(user.id);

  if (result.ok) {
    const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
    if (agent) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: "paused" },
      });
    }
  }

  return NextResponse.json(result);
}
