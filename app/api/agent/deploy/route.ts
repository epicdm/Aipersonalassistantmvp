import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { generateSoulMd } from "@/app/lib/soul-generator";
import { launchAgent, getAgentStatus, stopAgent } from "@/app/lib/runtime/agent-launcher";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let agentId: string | undefined;
  try { const body = await req.json(); agentId = body.agentId; } catch {}

  const agent = agentId
    ? await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
    : await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Merge: agent top-level fields take priority over config object
  const config = {
    name: agent.name,
    purpose: agent.purpose || "",
    tone: agent.tone || "friendly",
    template: agent.template || "assistant",
    tools: agent.tools ? JSON.parse(agent.tools as string) : [],
    approvalMode: agent.approvalMode || "confirm",
    ...((agent.config as any) || {}),
  };

  // Ensure name is set (use agent name as fallback)
  if (!config.name?.trim()) {
    config.name = agent.name || "My Agent";
  }
  if (!config.purpose?.trim()) {
    config.purpose = `I am ${config.name}, an AI assistant.`;
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
