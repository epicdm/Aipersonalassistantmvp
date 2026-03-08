import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { getMaxAgents } from "@/app/lib/templates";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  
  // Support ?all=true to get all agents, otherwise return first (backwards compat)
  const url = new URL(req.url);
  const all = url.searchParams.get("all");
  
  const agents = db.data!.agents.filter((a: any) => a.userId === user.id);
  
  if (all) {
    return NextResponse.json({ agents, plan: user.plan || "free" });
  }
  
  // Backwards compat: return single agent
  const agent = agents[0] || null;
  return NextResponse.json({ agent });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await loadDb();

  // Check if this is creating a new agent or updating existing
  if (body.name && !body._update) {
    // CREATE new agent
    const userAgents = db.data!.agents.filter((a: any) => a.userId === user.id);
    const maxAgents = getMaxAgents(user.plan || "free");
    
    if (userAgents.length >= maxAgents) {
      return NextResponse.json({ 
        error: `Your ${user.plan || "free"} plan allows ${maxAgents} agent${maxAgents > 1 ? 's' : ''}. Upgrade to add more.`,
        upgrade: true 
      }, { status: 403 });
    }

    const newAgent = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: body.name,
      template: body.template || null,
      purpose: body.config?.purpose || body.purpose || "",
      tone: body.config?.tone || "",
      tools: body.config?.tools || body.tools || [],
      approvalMode: body.config?.approvalMode || "confirm",
      config: body.config || {},
      whatsappStatus: "not_connected",
      phoneNumber: null,
      phoneStatus: "pending",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data!.agents.push(newAgent);
    await saveDb();
    return NextResponse.json({ agent: newAgent }, { status: 201 });
  }

  // UPDATE existing agent
  const { config, whatsappStatus, whatsappNumber, phoneNumber, phoneStatus, agentId } = body;
  
  const agent = agentId 
    ? db.data!.agents.find((a: any) => a.id === agentId && a.userId === user.id)
    : db.data!.agents.find((a: any) => a.userId === user.id);
    
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  if (config) {
    agent.config = config;
    agent.name = config.name || agent.name;
    agent.purpose = config.purpose || agent.purpose;
    agent.template = config.template || agent.template;
  }

  if (whatsappStatus !== undefined) agent.whatsappStatus = whatsappStatus;
  if (whatsappNumber !== undefined) { agent.whatsappNumber = whatsappNumber; agent.whatsappStatus = "number_saved"; }
  if (phoneNumber !== undefined) agent.phoneNumber = phoneNumber;
  if (phoneStatus !== undefined) agent.phoneStatus = phoneStatus;

  agent.updatedAt = new Date().toISOString();

  await saveDb();
  return NextResponse.json({ agent });
}

// DELETE an agent
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await req.json();
  await loadDb();

  const idx = db.data!.agents.findIndex((a: any) => a.id === agentId && a.userId === user.id);
  if (idx === -1) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  db.data!.agents.splice(idx, 1);
  await saveDb();
  return NextResponse.json({ ok: true });
}
