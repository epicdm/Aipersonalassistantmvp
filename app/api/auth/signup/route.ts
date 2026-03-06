import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/lib/session";
import { db, loadDb, saveDb } from "@/app/lib/localdb";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  await loadDb();
  const existing = db.data!.users.find((u) => u.email === email);
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = randomUUID();
  const user = { id: userId, email, passwordHash, createdAt: new Date().toISOString() };
  const defaultConfig = {
    name: "My Agent",
    role: "Executive Assistant",
    purpose: "You are a helpful AI assistant.",
    tone: "Professional",
    language: "English (US)",
    safetyFilter: true,
    officeHours: false,
  };

  const agent = {
    id: randomUUID(),
    userId,
    name: defaultConfig.name,
    purpose: defaultConfig.purpose,
    tools: [],
    whatsappStatus: "not_connected",
    phoneNumber: null,
    phoneStatus: "pending",
    config: defaultConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.data!.users.push(user);
  db.data!.agents.push(agent);
  await saveDb();

  const token = signToken({ id: user.id, email: user.email });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
