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

    // Get bills for this agent
    const bills = await prisma.bill.findMany({
      where: {
        agentId,
        userId: user.id,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching bills:", error);
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
    const { agentId, name, amount, dueDate, recurring } = body;

    if (!agentId || !name || !amount || !dueDate) {
      return NextResponse.json(
        { error: "agentId, name, amount, and dueDate are required" },
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

    // Create the bill
    const bill = await prisma.bill.create({
      data: {
        userId: user.id,
        agentId,
        name,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        recurring: recurring || null,
        paid: false,
      },
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error("Error creating bill:", error);
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
    const { id, paid } = body;

    if (!id || typeof paid !== "boolean") {
      return NextResponse.json(
        { error: "id and paid are required" },
        { status: 400 }
      );
    }

    // Verify the bill belongs to the user
    const bill = await prisma.bill.findFirst({
      where: { id, userId: user.id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Update the bill
    const updated = await prisma.bill.update({
      where: { id },
      data: { paid },
    });

    return NextResponse.json({ bill: updated });
  } catch (error) {
    console.error("Error updating bill:", error);
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

    // Verify the bill belongs to the user
    const bill = await prisma.bill.findFirst({
      where: { id, userId: user.id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Delete the bill
    await prisma.bill.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bill:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}