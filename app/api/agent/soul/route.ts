import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { generateSoulMd, generateAgentConfig } from "@/app/lib/soul-generator";

/**
 * GET /api/agent/soul
 * Returns the generated SOUL.md for the current user's agent.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = agent.config || {};
  const soul = generateSoulMd(config, user.name || user.email);
  const agentConfig = generateAgentConfig(config, user.id);

  return NextResponse.json({
    soul,
    agentConfig,
    preview: true,
  });
}

/**
 * POST /api/agent/soul
 * Generate + persist the SOUL.md. This is called when the user
 * clicks "Deploy Agent" or "Save & Activate".
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = agent.config || {};
  const soul = generateSoulMd(config, user.name || user.email);
  const agentConfig = generateAgentConfig(config, user.id);

  // Store the generated soul and config on the agent record
  agent.soul = soul;
  agent.agentConfig = agentConfig;
  agent.deployedAt = new Date().toISOString();
  agent.status = "active";

  await saveDb();

  return NextResponse.json({
    soul,
    agentConfig,
    deployed: true,
    deployedAt: agent.deployedAt,
  });
}
