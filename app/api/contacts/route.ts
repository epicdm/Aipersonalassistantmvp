import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts: contacts.map(c => ({ ...c, tags: JSON.parse(c.tags || "[]") })) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, email, notes, tags } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const contact = await prisma.contact.create({
    data: {
      userId: user.id,
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      tags: JSON.stringify(tags || []),
    },
  });

  return NextResponse.json({ contact: { ...contact, tags: JSON.parse(contact.tags) } }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, phone, email, notes, tags } = await req.json();
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      name: name || contact.name,
      phone: phone !== undefined ? phone : contact.phone,
      email: email !== undefined ? email : contact.email,
      notes: notes !== undefined ? notes : contact.notes,
      tags: tags ? JSON.stringify(tags) : contact.tags,
    },
  });

  return NextResponse.json({ contact: { ...updated, tags: JSON.parse(updated.tags) } });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
