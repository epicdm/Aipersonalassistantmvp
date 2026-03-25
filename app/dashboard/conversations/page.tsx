"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: string;
}

interface Conversation {
  id: string;
  agentId: string;
  agent?: { name: string };
  contact: { name?: string; phone: string };
  lastMessage?: string;
  messageCount: number;
  updatedAt: string;
  status: string;
  messages?: Message[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  needs_approval: { bg: "rgba(93,253,138,0.2)", color: "#006d2f", label: "Needs Approval" },
  pending_approval: { bg: "rgba(93,253,138,0.2)", color: "#006d2f", label: "Needs Approval" },
  human_requested: { bg: "rgba(186,26,26,0.1)", color: "#ba1a1a", label: "Human Requested" },
  active: { bg: "rgba(0,75,87,0.12)", color: "#004B57", label: "AI Active" },
  closed: { bg: "#f2f4f4", color: "#70787b", label: "Closed" },
};

export default function ConversationsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/conversations")
      .then(r => r.json())
      .then(data => {
        const convs = Array.isArray(data) ? data : [];
        setConversations(convs);
        if (convs.length > 0 && !selected) setSelected(convs[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  useEffect(() => {
    if (!selected?.agentId) return;
    fetch(`/api/agents/${selected.agentId}/messages`)
      .then(r => r.json())
      .then(data => setMessages(Array.isArray(data?.messages) ? data.messages : []))
      .catch(() => setMessages([]));
  }, [selected]);

  const handleApprove = async (msgId: string) => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", messageId: msgId }),
      });
      if (res.ok) {
        toast.success("Response approved and sent");
        setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, status: "sent" } : m));
      }
    } catch { toast.error("Failed to approve"); }
    finally { setSending(false); }
  };

  const handleSend = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", contactId: selected.contact.phone, message: draft }),
      });
      if (res.ok) {
        toast.success("Message sent");
        setDraft("");
      }
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const activeCount = conversations.filter(c => c.status === "active").length;
  const pendingCount = conversations.filter(c => c.status === "pending_approval" || c.status === "needs_approval").length;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 24, fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" }}>bubble_chart</span>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#004B57", letterSpacing: "-0.02em", margin: 0 }}>BFF Assistant</h1>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/dashboard" style={{ color: "#40484a", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>Home</Link>
            <Link href="/dashboard/agents" style={{ color: "#40484a", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>Agents</Link>
            <Link href="/dashboard/settings" style={{ color: "#40484a", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>Settings</Link>
          </div>
        </header>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 24px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e1e3e3" }}>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#006d2f" }}>{activeCount}</span>
            <p style={{ color: "#40484a", fontSize: "0.8rem", margin: "2px 0 0", fontWeight: 600 }}>AI Active</p>
          </div>
          <div style={{ background: pendingCount > 0 ? "rgba(93,253,138,0.15)" : "#fff", borderRadius: 12, padding: "16px 20px", border: `1px solid ${pendingCount > 0 ? "rgba(93,253,138,0.4)" : "#e1e3e3"}` }}>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: pendingCount > 0 ? "#006d2f" : "#00333c" }}>{pendingCount}</span>
            <p style={{ color: "#40484a", fontSize: "0.8rem", margin: "2px 0 0", fontWeight: 600 }}>Needs Approval</p>
          </div>
        </div>

        {/* Live Monitor */}
        <main style={{ flex: 1, padding: "0 24px 80px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#00333c", margin: 0 }}>Live Monitor</h2>
            <span style={{ background: "#f2f4f4", color: "#70787b", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 9999 }}>Real-time Pulse</span>
          </div>

          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 12, background: "#e1e3e3", marginBottom: 12, animation: "bff-pulse 2s infinite" }} />)
          ) : conversations.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#bfc8ca", display: "block", marginBottom: 12 }}>chat_bubble_outline</span>
              <p style={{ fontWeight: 600, color: "#00333c", marginBottom: 8 }}>No conversations yet</p>
              <p style={{ color: "#70787b", fontSize: "0.875rem", marginBottom: 24 }}>Connect WhatsApp to start receiving customer messages.</p>
              <Link href="/number" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "12px 24px", borderRadius: 9999, fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
                Connect WhatsApp <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          ) : (
            conversations.map(conv => {
              const statusCfg = STATUS_STYLE[conv.status] || STATUS_STYLE.active;
              const initials = (conv.contact.name || conv.contact.phone || "?").slice(0, 2).toUpperCase();
              const needsApproval = conv.status === "pending_approval" || conv.status === "needs_approval";
              const humanReq = conv.status === "human_requested";

              return (
                <div key={conv.id} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, border: "1px solid #e1e3e3", boxShadow: "0 2px 8px rgba(25,28,29,0.04)" }}>
                  {/* Contact row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: needsApproval ? 12 : 0 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,75,87,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#004B57" }}>
                          {initials}
                        </div>
                        <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: needsApproval ? "#5dfd8a" : humanReq ? "#ba1a1a" : "#5dfd8a", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 8, color: "#fff", fontVariationSettings: "'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 24" }}>{humanReq ? "person_alert" : "pending"}</span>
                        </div>
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: "#00333c", margin: 0, fontSize: "0.95rem" }}>{conv.contact.name || conv.contact.phone}</p>
                        <p style={{ color: "#70787b", fontSize: "0.75rem", margin: "2px 0 0" }}>
                          {conv.agent?.name} · {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>
                    <span style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 9999 }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Last message preview */}
                  {conv.lastMessage && (
                    <div style={{ background: "#f2f4f4", borderRadius: 12, padding: 12, marginBottom: needsApproval ? 12 : 0, borderLeft: needsApproval ? "3px solid #5dfd8a" : "none" }}>
                      {needsApproval && <p style={{ fontSize: "0.7rem", color: "#70787b", marginBottom: 4 }}>AI Drafted:</p>}
                      <p style={{ color: "#191c1d", fontSize: "0.875rem", margin: 0, fontStyle: needsApproval ? "italic" : "normal" }}>{conv.lastMessage}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {needsApproval && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleApprove(conv.id)} disabled={sending}
                        style={{ flex: 1, background: "#006d2f", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" }}>check_circle</span>
                        Approve & Send
                      </button>
                      <button onClick={() => setDraft(conv.lastMessage || "")}
                        style={{ width: 44, background: "#f2f4f4", color: "#00333c", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit_note</span>
                      </button>
                    </div>
                  )}

                  {humanReq && (
                    <button style={{ width: "100%", background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forum</span>
                      Take Over Chat
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Quick reply input */}
          {conversations.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e1e3e3", marginTop: 8 }}>
              <p style={{ fontSize: "0.7rem", color: "#70787b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Quick Reply</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  style={{ flex: 1, background: "#f2f4f4", border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none" }} />
                <button onClick={handleSend} disabled={sending || !draft.trim()}
                  style={{ background: "#00333c", color: "#fff", border: "none", borderRadius: 12, width: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: !draft.trim() ? 0.4 : 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats", active: true },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 20px", borderRadius: 16, textDecoration: "none", background: item.active ? "#004B57" : "transparent", color: item.active ? "#fff" : "#40484a" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: item.active ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>{item.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardShell>
  );
}
