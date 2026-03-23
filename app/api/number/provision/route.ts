import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { sendWhatsAppMessage } from "@/app/lib/whatsapp";

const ERIC_PHONE = "17672858382"; // Eric's WA number for admin alerts

/**
 * POST /api/number/provision
 * "Get a New Number" path — queues the request, notifies Eric via WhatsApp.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Parse request body
  let business_name = "";
  let country_code = "+1767";
  try {
    const body = await req.json();
    business_name = body.business_name || "";
    country_code = body.country_code || "+1767";
  } catch {}

  // Save provision request on the agent record
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      phoneStatus: "provision_requested",
    },
  });

  // Log to AgentActivity so it's visible in the dashboard
  try {
    await (prisma as any).agentActivity.create({
      data: {
        agentId: agent.id,
        type: "number_provision_requested",
        data: {
          business_name,
          country_code,
          requestedAt: new Date().toISOString(),
          userEmail: user.email || "",
        },
      },
    });
  } catch {
    // AgentActivity may not exist — non-fatal
  }

  // Notify Eric via WhatsApp
  const agentName = agent.name || "Unknown";
  const userEmail = user.email || user.id;
  const msg =
    `🆕 *New Number Request*\n\n` +
    `Agent: ${agentName}\n` +
    `Business: ${business_name || "N/A"}\n` +
    `Country: ${country_code}\n` +
    `User: ${userEmail}\n` +
    `Agent ID: ${agent.id}\n\n` +
    `Action needed: provision a WhatsApp number and update the agent record.`;

  try {
    await sendWhatsAppMessage(ERIC_PHONE, msg);
  } catch (err) {
    // Notification failure is non-fatal — log it but don't break the response
    console.error("[provision] Failed to notify Eric via WA:", err);
  }

  return NextResponse.json({
    success: true,
    status: "queued",
    message:
      "Request received! We'll set up your number within 24 hours and WhatsApp you when it's ready.",
  });
}

/**
 * GET /api/number/provision
 * Returns current phone status for the user's agent.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });

  return NextResponse.json({
    phoneNumber: agent?.phoneNumber || null,
    phoneStatus: agent?.phoneStatus || "pending",
  });
}
