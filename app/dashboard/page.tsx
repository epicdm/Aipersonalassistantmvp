"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  template: string;
  status: string;
  whatsappStatus: string;
  ownerPhone: string | null;
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
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "there";

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/agent?all=true").then(r => r.json()).catch(() => ({ agents: [] })),
      fetch("/api/conversations").then(r => r.json()).catch(() => []),
    ]).then(([agentData, convData]) => {
      setAgents(Array.isArray(agentData?.agents) ? agentData.agents : agentData?.agent ? [agentData.agent] : []);
      setConversations(Array.isArray(convData) ? convData.slice(0, 6) : []);
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) return null;

  const activeAgents = agents.filter(a => a.status === "active").length;
  const waConnected = agents.filter(a => a.ownerPhone || a.whatsappStatus === 'connected').length;
  const totalMessages = conversations.reduce((s, c) => s + (c.messageCount || 0), 0);
  const pending = conversations.filter(c => c.status === "pending_approval").length;

  // No agents — empty state
  if (!loading && agents.length === 0) {
    return (
      <DashboardShell>
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
          <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#004B57" }}>BFF</span>
          </header>
          <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: "rgba(0,75,87,0.1)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#004B57", fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" }}>smart_toy</span>
            </div>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#00333c", marginBottom: 12 }}>
              {greeting}, {firstName}
            </h1>
            <p style={{ color: "#40484a", fontSize: "1rem", lineHeight: 1.6, marginBottom: 32 }}>
              Set up your first AI agent to start handling customer conversations on WhatsApp.
            </p>
            <Link href="/create" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "14px 32px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
              Create your first agent
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </main>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#004B57", letterSpacing: "-0.02em" }}>BFF</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e7e8e9")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            <span className="material-symbols-outlined" style={{ color: "#004B57" }}>notifications</span>
          </button>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", paddingBottom: 80 }}>

          {/* Greeting */}
          <section style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,4vw,2.5rem)", color: "#00333c", letterSpacing: "-0.03em", marginBottom: 8 }}>
              {greeting}, {firstName}
            </h1>
            <p style={{ color: "#40484a", fontSize: "1.05rem", lineHeight: 1.6, maxWidth: 520 }}>
              {totalMessages > 0
                ? <>Your AI handled <strong style={{ color: "#006d2f" }}>{totalMessages.toLocaleString()} messages</strong> so far. Here's what needs your attention.</>
                : "Your AI agents are ready. Connect WhatsApp to start receiving messages."}
            </p>
          </section>

          {/* Getting Started Banner — shows when agent exists but no WhatsApp connected */}
          {!loading && agents.length > 0 && waConnected === 0 && (
            <section style={{ background: "linear-gradient(135deg, #0066ff15, #00333c10)", border: "1px solid #00333c20", borderRadius: 16, padding: 24, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 48, height: 48, background: "#00333c15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 24 }}>📱</span>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#00333c", margin: "0 0 6px" }}>
                    Connect your WhatsApp number
                  </h3>
                  <p style={{ color: "#40484a", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Your agent <strong>{agents[0]?.name}</strong> is ready! Connect a WhatsApp number so customers can start messaging.
                    You can bring your own business number or get a new Dominica (+1 767) number from us.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href="/number" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "10px 20px", borderRadius: 9999, fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                      Connect WhatsApp Number
                    </Link>
                    <Link href="/dashboard/settings" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#00333c", border: "1px solid #00333c30", padding: "10px 20px", borderRadius: 9999, fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                      Configure {agents[0]?.name} first
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Bento cards */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
            {/* Active agents */}
            <div style={{ background: "linear-gradient(135deg,#00333c,#004B57)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="material-symbols-outlined" style={{ color: "#5dfd8a", fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>smart_toy</span>
                {activeAgents > 0 && <span style={{ background: "rgba(93,253,138,0.2)", color: "#5dfd8a", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 9999 }}>Active</span>}
              </div>
              <div>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#fff", margin: "0 0 4px" }}>{loading ? "—" : activeAgents}</h3>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", margin: 0 }}>AI agents running</p>
              </div>
            </div>

            {/* Pending approval */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140, border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ color: pending > 0 ? "#f59e0b" : "#bfc8ca" }}>pending_actions</span>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#00333c", margin: 0 }}>{loading ? "—" : pending}</h3>
                  {pending > 0 && <span style={{ color: "#f59e0b", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>Review</span>}
                </div>
                <p style={{ color: "#40484a", fontSize: "0.85rem", margin: "4px 0 0" }}>Awaiting approval</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140, border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ color: waConnected > 0 ? "#006d2f" : "#bfc8ca", fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>chat</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: waConnected > 0 ? "#5dfd8a" : "#bfc8ca", animation: waConnected > 0 ? "bff-pulse 2s infinite" : "none" }} />
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#00333c", margin: 0 }}>
                    {loading ? "—" : waConnected > 0 ? "Connected" : "Not connected"}
                  </h3>
                </div>
                <p style={{ color: "#40484a", fontSize: "0.85rem", margin: "4px 0 0" }}>
                  {waConnected} of {agents.length} agents on WhatsApp
                </p>
              </div>
            </div>
          </section>

          {/* Performance */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", margin: 0 }}>Performance Snapshot</h2>
              <div style={{ flex: 1, height: 1, background: "#e1e3e3" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
              <div style={{ background: "#f2f4f4", borderRadius: 12, padding: 24 }}>
                <p style={{ color: "#70787b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px" }}>Total Messages</p>
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#00333c", margin: "0 0 12px" }}>{loading ? "—" : totalMessages.toLocaleString()}</h4>
                <div style={{ height: 40, display: "flex", alignItems: "flex-end", gap: 2 }}>
                  {[30,55,40,70,60,90,75].map((v,i) => (
                    <div key={i} style={{ flex: 1, background: i === 6 ? "#004B57" : "rgba(0,75,87,0.2)", borderRadius: "2px 2px 0 0", height: `${v}%` }} />
                  ))}
                </div>
              </div>
              <div style={{ background: "#f2f4f4", borderRadius: 12, padding: 24 }}>
                <p style={{ color: "#70787b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px" }}>Active Conversations</p>
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#00333c", margin: "0 0 12px" }}>{loading ? "—" : conversations.length}</h4>
                <div style={{ height: 40, display: "flex", alignItems: "flex-end", gap: 2 }}>
                  {[50,65,35,55,70,100,80].map((v,i) => (
                    <div key={i} style={{ flex: 1, background: i === 6 ? "#006d2f" : "rgba(93,253,138,0.3)", borderRadius: "2px 2px 0 0", height: `${v}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", margin: 0 }}>Recent Activity</h2>
              <Link href="/dashboard/conversations" style={{ color: "#004B57", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                View all <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </Link>
            </div>

            {loading ? (
              <div style={{ space: "12px 0" }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "#e1e3e3", marginBottom: 8, animation: "bff-pulse 2s infinite" }} />)}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e1e3e3" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#bfc8ca", display: "block", marginBottom: 12 }}>chat_bubble</span>
                <p style={{ fontWeight: 600, color: "#00333c", marginBottom: 6 }}>No conversations yet</p>
                <p style={{ color: "#70787b", fontSize: "0.875rem", marginBottom: 20 }}>Connect your WhatsApp number to start receiving messages.</p>
                <Link href="/number" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "10px 24px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
                  Connect WhatsApp <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div>
                {conversations.map(conv => (
                  <Link key={conv.id} href="/dashboard/conversations" style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", borderRadius: 12, padding: 20, marginBottom: 8, border: "1px solid #e1e3e3", textDecoration: "none", transition: "border-color 0.15s" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#004B57")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#e1e3e3")}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,75,87,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#004B57", fontSize: "0.9rem" }}>
                      {(conv.contact.name || conv.contact.phone || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontWeight: 600, color: "#00333c", margin: 0, fontSize: "0.9rem" }}>
                          {conv.contact.name || conv.contact.phone}
                        </p>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: "rgba(93,253,138,0.2)", color: "#006d2f" }}>
                          AI Active
                        </span>
                      </div>
                      <p style={{ color: "#70787b", fontSize: "0.8rem", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <span style={{ color: "#bfc8ca", fontSize: "0.75rem", flexShrink: 0 }}>
                      {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)", boxShadow: "0 -10px 40px rgba(25,28,29,0.04)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home", active: true },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 20px", borderRadius: 16, textDecoration: "none", background: item.active ? "#004B57" : "transparent", color: item.active ? "#fff" : "#40484a", transition: "all 0.2s" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: item.active ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>{item.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardShell>
  );
}
