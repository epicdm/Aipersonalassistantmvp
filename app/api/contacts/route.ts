import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { randomUUID } from "crypto";

/**
 * GET /api/contacts — List user's contacts
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const contacts = (db.data!.contacts || []).filter((c) => c.userId === user.id);
  return NextResponse.json({ contacts });
}

/**
 * POST /api/contacts — Create a new contact
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, email, notes, tags } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
  }
  if (!phone?.trim() && !email?.trim()) {
    return NextResponse.json({ error: "Phone or email is required" }, { status: 400 });
  }

  await loadDb();

  const contact = {
    id: randomUUID().slice(0, 8),
    userId: user.id,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
    notes: notes?.trim() || undefined,
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };

  db.data!.contacts.push(contact);
  await saveDb();

  return NextResponse.json({ contact });
}

/**
 * PUT /api/contacts — Update a contact
 */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, phone, email, notes, tags } = await req.json();

  await loadDb();
  const contact = db.data!.contacts.find((c) => c.id === id && c.userId === user.id);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  if (name) contact.name = name.trim();
  if (phone !== undefined) contact.phone = phone?.trim() || undefined;
  if (email !== undefined) contact.email = email?.trim() || undefined;
  if (notes !== undefined) contact.notes = notes?.trim() || undefined;
  if (tags !== undefined) contact.tags = tags;

  await saveDb();
  return NextResponse.json({ contact });
}

/**
 * DELETE /api/contacts — Delete a contact
 */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  await loadDb();
  const idx = db.data!.contacts.findIndex((c) => c.id === id && c.userId === user.id);
  if (idx === -1) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  db.data!.contacts.splice(idx, 1);
  await saveDb();

  return NextResponse.json({ ok: true });
}
