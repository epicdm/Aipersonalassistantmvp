import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { generateSoulMd, generateAgentConfig } from "@/app/lib/soul-generator";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = (agent.config as any) || {};
  const soul = generateSoulMd(config, user.name || user.email);
  const agentConfig = generateAgentConfig(config, user.id);

  return NextResponse.json({ soul, agentConfig, preview: true });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = (agent.config as any) || {};
  const soul = generateSoulMd(config, user.name || user.email);
  const agentConfig = generateAgentConfig(config, user.id);

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      soul,
      deployedAt: new Date(),
      status: "active",
    },
  });

  return NextResponse.json({ soul, agentConfig, deployed: true, deployedAt: new Date().toISOString() });
}
