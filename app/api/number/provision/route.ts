import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

/**
 * POST /api/number/provision
 * Phone number provisioning - placeholder for MagnusBilling/LiveKit integration.
 * Will be wired up when phone service is ready.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Phone provisioning not yet available on Vercel deployment
  return NextResponse.json({
    error: "Phone number provisioning coming soon! WhatsApp is available now.",
    status: "coming_soon",
  }, { status: 503 });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });

  return NextResponse.json({
    phoneNumber: agent?.phoneNumber || null,
    phoneStatus: agent?.phoneStatus || "pending",
  });
}
