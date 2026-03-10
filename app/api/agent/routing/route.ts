import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({
    where: { userId: user.id },
    select: { inboundRouting: true, didNumber: true }
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    inboundRouting: agent.inboundRouting || "whatsapp",
    didNumber: agent.didNumber
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { inboundRouting } = body;

  // Validate routing value
  const validRouting = ["whatsapp", "ai", "whatsapp_then_ai"];
  if (!validRouting.includes(inboundRouting)) {
    return NextResponse.json(
      { error: "Invalid routing value. Must be one of: whatsapp, ai, whatsapp_then_ai" },
      { status: 400 }
    );
  }

  const agent = await prisma.agent.findFirst({
    where: { userId: user.id }
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { inboundRouting }
  });

  return NextResponse.json({
    inboundRouting: updated.inboundRouting,
    didNumber: updated.didNumber
  });
}