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

    // Get todos for this agent
    const todos = await prisma.todo.findMany({
      where: {
        agentId,
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ todos });
  } catch (error) {
    console.error("Error fetching todos:", error);
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
    const { agentId, text } = body;

    if (!agentId || !text) {
      return NextResponse.json(
        { error: "agentId and text are required" },
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

    // Create the todo
    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        agentId,
        text,
        done: false,
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
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
    const { id, done } = body;

    if (!id || typeof done !== "boolean") {
      return NextResponse.json(
        { error: "id and done are required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to the user
    const todo = await prisma.todo.findFirst({
      where: { id, userId: user.id },
    });

    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // Update the todo
    const updated = await prisma.todo.update({
      where: { id },
      data: { done },
    });

    return NextResponse.json({ todo: updated });
  } catch (error) {
    console.error("Error updating todo:", error);
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

    // Verify the todo belongs to the user
    const todo = await prisma.todo.findFirst({
      where: { id, userId: user.id },
    });

    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // Delete the todo
    await prisma.todo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}