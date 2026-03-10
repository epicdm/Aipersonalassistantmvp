import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

type ContactInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

/**
 * Normalize a phone string to E.164-ish format:
 * - Strip spaces, dashes, parentheses
 * - Keep leading +
 * - Keep digits only otherwise
 */
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[\s\-().]/g, "");
  // Must have at least 7 digits
  const digits = stripped.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // Preserve leading + if present
  return stripped.startsWith("+") ? stripped : digits;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { contacts: ContactInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contacts } = body;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array required" }, { status: 400 });
  }

  const errors: string[] = [];
  const toInsert: { userId: string; name: string; phone: string | null; email: string | null; notes: string | null; tags: string }[] = [];
  const seenPhones = new Set<string>();

  // Validate and normalize
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const rowLabel = `Row ${i + 1} (${c.name || "unnamed"})`;

    if (!c.phone && !c.email) {
      errors.push(`${rowLabel}: phone or email required`);
      continue;
    }

    let phone: string | null = null;
    if (c.phone) {
      phone = normalizePhone(c.phone);
      if (!phone) {
        errors.push(`${rowLabel}: invalid phone "${c.phone}"`);
        continue;
      }
    }

    toInsert.push({
      userId: user.id,
      name: (c.name || "Unknown").trim(),
      phone,
      email: c.email?.trim() || null,
      notes: c.notes?.trim() || null,
      tags: "[]",
    });

    if (phone) seenPhones.add(phone);
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, errors });
  }

  // Fetch existing contacts to check duplicates (by phone+userId)
  const phonesToCheck = toInsert.map((c) => c.phone).filter(Boolean) as string[];
  const existing = await prisma.contact.findMany({
    where: {
      userId: user.id,
      phone: { in: phonesToCheck },
    },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((c) => c.phone).filter(Boolean) as string[]);

  const newContacts = toInsert.filter((c) => !c.phone || !existingPhones.has(c.phone));
  const skipped = toInsert.length - newContacts.length;

  // Bulk insert
  let imported = 0;
  if (newContacts.length > 0) {
    const result = await prisma.contact.createMany({
      data: newContacts,
      skipDuplicates: true,
    });
    imported = result.count;
  }

  return NextResponse.json({ imported, skipped, errors });
}
