import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const agent = db.data!.agents.find((a) => a.userId === user.id);
  return NextResponse.json({ agent });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { config, whatsappStatus, whatsappNumber, phoneNumber, phoneStatus } = await req.json();

  await loadDb();
  const agent = db.data!.agents.find((a) => a.userId === user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  if (config) {
    agent.config = config;
    agent.name = config.name || agent.name;
    agent.purpose = config.purpose || agent.purpose;
  }

  if (whatsappStatus !== undefined) agent.whatsappStatus = whatsappStatus;
  if (whatsappNumber !== undefined) { agent.whatsappNumber = whatsappNumber; agent.whatsappStatus = "number_saved"; }
  if (phoneNumber !== undefined) agent.phoneNumber = phoneNumber;
  if (phoneStatus !== undefined) agent.phoneStatus = phoneStatus;

  agent.updatedAt = new Date().toISOString();

  await saveDb();
  return NextResponse.json({ agent });
}
