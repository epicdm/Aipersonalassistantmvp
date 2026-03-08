import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get reminders for this agent
    const reminders = await prisma.reminder.findMany({
      where: {
        agentId,
        userId: user.id,
        datetime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        datetime: "asc",
      },
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, text, datetime, recurring } = body;

    if (!agentId || !text || !datetime) {
      return NextResponse.json(
        { error: "agentId, text, and datetime are required" },
        { status: 400 }
      );
    }

    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Create the reminder
    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        agentId,
        text,
        datetime: new Date(datetime),
        recurring: recurring || null,
        sent: false,
      },
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, sent } = body;

    if (!id || typeof sent !== "boolean") {
      return NextResponse.json(
        { error: "id and sent are required" },
        { status: 400 }
      );
    }

    // Verify the reminder belongs to the user
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Update the reminder
    const updated = await prisma.reminder.update({
      where: { id },
      data: { sent },
    });

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify the reminder belongs to the user
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Delete the reminder
    await prisma.reminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}