import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { generateSoulMd } from "@/app/lib/soul-generator";
import { launchAgent, getAgentStatus, stopAgent } from "@/app/lib/runtime/agent-launcher";

/**
 * POST /api/agent/deploy
 * Deploy (or redeploy) the user's agent as a live OpenClaw instance.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = agent.config || {};

  // Validate minimum config
  if (!config.name?.trim()) {
    return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
  }
  if (!config.purpose?.trim()) {
    return NextResponse.json({ error: "Agent purpose is required" }, { status: 400 });
  }

  // Generate SOUL.md
  const soul = generateSoulMd(config, user.name || user.email);

  // Launch the agent runtime
  const result = await launchAgent(
    { id: user.id, email: user.email, name: user.name },
    config,
    "starter" // MVP: everyone gets starter tier
  );

  if (result.status === "error") {
    return NextResponse.json(
      { error: `Deployment failed: ${result.error}` },
      { status: 500 }
    );
  }

  // Update DB with deployment info
  agent.soul = soul;
  agent.deployment = {
    agentId: result.agentId,
    status: result.status,
    port: result.port,
    workspace: result.workspace,
    deployedAt: new Date().toISOString(),
  };
  agent.status = "active";
  agent.deployedAt = new Date().toISOString();

  await saveDb();

  return NextResponse.json({
    success: true,
    deployment: agent.deployment,
    soul,
  });
}

/**
 * GET /api/agent/deploy
 * Check deployment status.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = getAgentStatus(user.id);

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);

  return NextResponse.json({
    ...status,
    deployment: agent?.deployment || null,
    agentName: agent?.config?.name || null,
  });
}

/**
 * DELETE /api/agent/deploy
 * Stop and deactivate the agent.
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await stopAgent(user.id);

  if (result.ok) {
    await loadDb();
    const agent = db.data!.agents.find((a: any) => a.userId === user.id);
    if (agent) {
      agent.status = "inactive";
      if (agent.deployment) agent.deployment.status = "stopped";
      await saveDb();
    }
  }

  return NextResponse.json(result);
}
