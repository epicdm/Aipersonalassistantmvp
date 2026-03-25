"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  template: string;
  status: string;
  whatsappStatus: string;
  ownerPhone: string | null;
  activationCode: string | null;
  createdAt: string;
  purpose?: string;
  tone?: string;
}

const TEMPLATE_ICON: Record<string, string> = {
  receptionist: "phone",
  concierge: "hotel",
  sales: "trending_up",
  support: "headset_mic",
  collector: "payments",
  assistant: "person",
  "study-buddy": "school",
  default: "smart_toy",
};

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  active:  { bg: "rgba(93,253,138,0.2)", color: "#006d2f", dot: "#5dfd8a" },
  draft:   { bg: "#f2f4f4", color: "#70787b", dot: "#bfc8ca" },
  paused:  { bg: "rgba(245,158,11,0.1)", color: "#b45309", dot: "#f59e0b" },
};

export default function AgentsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/agent?all=true")
      .then(r => r.json())
      .then(data => setAgents(Array.isArray(data?.agents) ? data.agents : data?.agent ? [data.agent] : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const handleDeploy = async (agentId: string) => {
    setDeploying(agentId);
    try {
      const res = await fetch("/api/agent/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Agent deployed successfully");
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "active" } : a));
      } else {
        toast.error(data.error || "Deploy failed");
      }
    } catch { toast.error("Deploy failed"); }
    finally { setDeploying(null); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const activeCount = agents.filter(a => a.status === "active").length;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>

        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 24, fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" }}>bubble_chart</span>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#004B57", letterSpacing: "-0.02em", margin: 0 }}>BFF Assistant</h1>
          </div>
          <Link href="/create" style={{ display: "flex", alignItems: "center", gap: 6, background: "#00333c", color: "#fff", padding: "8px 16px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", textDecoration: "none" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Agent
          </Link>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 100px" }}>

          {/* Hero stats */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "rgba(93,253,138,0.2)", marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#006d2f", animation: activeCount > 0 ? "bff-pulse 2s infinite" : "none" }} />
              <span style={{ color: "#006d2f", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {activeCount} agent{activeCount !== 1 ? "s" : ""} live
              </span>
            </div>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,4vw,2.5rem)", color: "#00333c", letterSpacing: "-0.03em", marginBottom: 12 }}>
              Your Business, Powered by <span style={{ color: "#006d2f" }}>AI</span>
            </h1>
            <p style={{ color: "#40484a", fontSize: "1rem", lineHeight: 1.6, maxWidth: 500 }}>
              Each agent handles conversations on WhatsApp 24/7. Engineered for reliability.
            </p>
          </section>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { icon: "smart_toy", label: "Autonomous Agent", desc: "Handles conversations without you" },
              { icon: "verified", label: "Total Control", desc: "Approve, edit, or take over anytime" },
              { icon: "bolt", label: "Instant Setup", desc: "Live in under 5 minutes" },
              { icon: "schedule", label: "24/7 Presence", desc: "Never miss a customer message" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e1e3e3", borderRadius: 12, padding: "10px 14px" }}>
                <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#00333c" }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Agents list */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", margin: 0 }}>
              Your Agents ({agents.length})
            </h2>
          </div>

          {loading ? (
            [1,2].map(i => <div key={i} style={{ height: 120, borderRadius: 16, background: "#e1e3e3", marginBottom: 12, animation: "bff-pulse 2s infinite" }} />)
          ) : agents.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", border: "2px dashed #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#bfc8ca", display: "block", marginBottom: 16 }}>smart_toy</span>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#00333c", marginBottom: 8 }}>No agents yet</h3>
              <p style={{ color: "#70787b", marginBottom: 24 }}>Create your first AI agent to get started.</p>
              <Link href="/create" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "12px 28px", borderRadius: 9999, fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
                Create your first agent <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          ) : (
            <>
              {agents.map(agent => {
                const statusCfg = STATUS_STYLE[agent.status] || STATUS_STYLE.draft;
                const icon = TEMPLATE_ICON[agent.template] || TEMPLATE_ICON.default;
                const isDeploying = deploying === agent.id;

                return (
                  <div key={agent.id} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, border: "1px solid #e1e3e3" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(0,75,87,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#004B57", fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>{icon}</span>
                        </div>
                        <div>
                          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#00333c", margin: "0 0 4px" }}>{agent.name}</h3>
                          <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0, textTransform: "capitalize" }}>{agent.template} agent</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: statusCfg.bg, padding: "4px 10px", borderRadius: 9999 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusCfg.dot, animation: agent.status === "active" ? "bff-pulse 2s infinite" : "none" }} />
                        <span style={{ color: statusCfg.color, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {agent.status}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f2f4f4", borderRadius: 10, marginBottom: 14 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: agent.ownerPhone ? "#006d2f" : "#bfc8ca", fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>chat</span>
                      <span style={{ fontSize: "0.8rem", color: agent.ownerPhone ? "#006d2f" : "#70787b", fontWeight: 500 }}>
                        {agent.ownerPhone ? `WhatsApp connected · ${agent.ownerPhone}` : "WhatsApp not connected"}
                      </span>
                      {!agent.ownerPhone && (
                        <Link href="/number" style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#004B57", fontWeight: 600, textDecoration: "none" }}>
                          Connect →
                        </Link>
                      )}
                    </div>

                    {/* Activation code */}
                    {agent.activationCode && !agent.ownerPhone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(93,253,138,0.1)", borderRadius: 10, marginBottom: 14, border: "1px solid rgba(93,253,138,0.3)" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#006d2f" }}>key</span>
                        <span style={{ fontSize: "0.8rem", color: "#40484a" }}>Activation code:</span>
                        <code style={{ fontFamily: "monospace", fontWeight: 700, color: "#00333c", letterSpacing: "0.1em", fontSize: "0.85rem" }}>{agent.activationCode}</code>
                        <span style={{ fontSize: "0.75rem", color: "#70787b", marginLeft: "auto" }}>Text to +17672950333</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {agent.status !== "active" && (
                        <button onClick={() => handleDeploy(agent.id)} disabled={isDeploying}
                          style={{ flex: 1, background: "#00333c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: isDeploying ? 0.7 : 1 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isDeploying ? "hourglass_empty" : "rocket_launch"}</span>
                          {isDeploying ? "Deploying..." : "Deploy Agent"}
                        </button>
                      )}
                      <Link href={`/dashboard/conversations`}
                        style={{ flex: agent.status === "active" ? 1 : 0, minWidth: 44, background: "rgba(0,75,87,0.08)", color: "#004B57", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat_bubble</span>
                        {agent.status === "active" && "View Conversations"}
                      </Link>
                      <Link href={`/dashboard/settings`}
                        style={{ width: 44, background: "#f2f4f4", color: "#40484a", borderRadius: 10, padding: "10px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Add another */}
              <Link href="/create" style={{ display: "flex", alignItems: "center", gap: 14, background: "transparent", border: "2px dashed #bfc8ca", borderRadius: 16, padding: 20, textDecoration: "none", transition: "border-color 0.2s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#004B57")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#bfc8ca")}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f2f4f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#70787b" }}>add</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#40484a", margin: "0 0 2px", fontSize: "0.95rem" }}>Add another agent</p>
                  <p style={{ color: "#bfc8ca", fontSize: "0.8rem", margin: 0 }}>Each agent handles a different line of business</p>
                </div>
              </Link>
            </>
          )}
        </main>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents", active: true },
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
