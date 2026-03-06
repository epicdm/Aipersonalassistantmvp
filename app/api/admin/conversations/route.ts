import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import { getChatStore, injectHint, injectBarge } from "@/app/lib/chat-store";

const ADMIN_EMAILS = ["eric.giraud@epic.dm", "eric@epic.dm", "test2@example.com", "test@example.com", "admin@epic.dm"];

function isAdmin(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * GET /api/admin/conversations
 * Returns ALL active user chats for supervision.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await loadDb();
  const store = getChatStore();

  const activeSessions: any[] = [];

  for (const [userId, messages] of store.entries()) {
    const dbUser = db.data!.users.find((u) => u.id === userId);
    const agent = db.data!.agents.find((a: any) => a.userId === userId);

    activeSessions.push({
      userId,
      userEmail: dbUser?.email || "unknown",
      userName: dbUser?.name || dbUser?.email || "Unknown User",
      agentName: agent?.config?.name || agent?.name || "Agent",
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] || null,
      messages: messages.slice(-30),
    });
  }

  const outbound = (db.data!.conversations || []).map((conv) => {
    const contact = db.data!.contacts.find((c) => c.id === conv.contactId);
    const dbUser = db.data!.users.find((u) => u.id === conv.userId);
    return { ...conv, contact, userEmail: dbUser?.email };
  });

  return NextResponse.json({
    activeSessions,
    outboundConversations: outbound,
    totalSessions: activeSessions.length,
  });
}

/**
 * POST /api/admin/conversations
 * 
 * action: "hint"   — system message agent sees, user doesn't
 * action: "barge"  — message appears as if the agent said it
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action, message } = await req.json();

  if (!userId || !message?.trim()) {
    return NextResponse.json({ error: "userId and message required" }, { status: 400 });
  }

  const store = getChatStore();
  if (!store.has(userId)) {
    return NextResponse.json({ error: "No active session for this user" }, { status: 404 });
  }

  if (action === "hint") {
    injectHint(userId, message.trim());
    return NextResponse.json({
      ok: true,
      action: "hint",
      note: "Agent will see this hint on the next user message.",
    });
  }

  if (action === "barge") {
    injectBarge(userId, message.trim(), user.email);
    return NextResponse.json({
      ok: true,
      action: "barge",
      note: "Message injected. User will see it on their next poll.",
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
