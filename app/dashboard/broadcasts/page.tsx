"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  name: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  createdAt: string;
  scheduledAt: string | null;
  agent: { id: string; name: string } | null;
  message?: string;
}

interface Agent {
  id: string;
  name: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  draft:     { bg: "#f2f4f4", color: "#70787b", icon: "edit" },
  scheduled: { bg: "rgba(245,158,11,0.1)", color: "#b45309", icon: "schedule" },
  sending:   { bg: "rgba(0,75,87,0.1)", color: "#004B57", icon: "send" },
  sent:      { bg: "rgba(93,253,138,0.15)", color: "#006d2f", icon: "check_circle" },
  failed:    { bg: "rgba(186,26,26,0.1)", color: "#ba1a1a", icon: "error" },
};

export default function BroadcastsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", message: "", agentId: "" });

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/broadcast").then(r => r.json()).catch(() => ({ broadcasts: [] })),
      fetch("/api/agent?all=true").then(r => r.json()).catch(() => ({ agents: [] })),
    ]).then(([bcData, agentData]) => {
      setBroadcasts(Array.isArray(bcData?.broadcasts) ? bcData.broadcasts : []);
      const agentList = Array.isArray(agentData?.agents) ? agentData.agents : agentData?.agent ? [agentData.agent] : [];
      setAgents(agentList);
      if (agentList.length > 0) setNewForm(f => ({ ...f, agentId: agentList[0].id }));
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const createBroadcast = async () => {
    if (!newForm.name.trim() || !newForm.message.trim()) {
      toast.error("Name and message are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newForm.name, message: newForm.message, agentId: newForm.agentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Broadcast created");
        setBroadcasts(prev => [data.broadcast, ...prev]);
        setShowNew(false);
        setNewForm(f => ({ ...f, name: "", message: "" }));
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch { toast.error("Failed to create"); }
    finally { setCreating(false); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const sentCount = broadcasts.filter(b => b.status === "sent").length;
  const totalReach = broadcasts.reduce((s, b) => s + (b.sentCount || 0), 0);

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>

        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Broadcasts</h1>
          <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#00333c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Broadcast
          </button>
        </header>

        <main style={{ maxWidth: 700, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e1e3e3" }}>
              <p style={{ color: "#70787b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Total</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#00333c", margin: 0 }}>{broadcasts.length}</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e1e3e3" }}>
              <p style={{ color: "#70787b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Sent</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#006d2f", margin: 0 }}>{sentCount}</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e1e3e3" }}>
              <p style={{ color: "#70787b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Reached</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#004B57", margin: 0 }}>{totalReach.toLocaleString()}</p>
            </div>
          </div>

          {/* New broadcast form */}
          {showNew && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e1e3e3", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#00333c", marginBottom: 20 }}>New Broadcast</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Name</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. March Promotion"
                  style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
              </div>
              {agents.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Agent</label>
                  <select value={newForm.agentId} onChange={e => setNewForm(f => ({ ...f, agentId: e.target.value }))}
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none" }}>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Message</label>
                <textarea value={newForm.message} onChange={e => setNewForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Type your broadcast message..."
                  rows={4}
                  style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={createBroadcast} disabled={creating}
                  style={{ flex: 1, background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
                  {creating ? "Creating..." : "Save as Draft"}
                </button>
                <button onClick={() => setShowNew(false)}
                  style={{ width: 48, background: "#f2f4f4", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#40484a" }}>close</span>
                </button>
              </div>
            </div>
          )}

          {/* Broadcasts list */}
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ height: 88, borderRadius: 14, background: "#e1e3e3", marginBottom: 10, animation: "bff-pulse 2s infinite" }} />)
          ) : broadcasts.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "#bfc8ca", display: "block", marginBottom: 14 }}>campaign</span>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#00333c", marginBottom: 8 }}>No broadcasts yet</h3>
              <p style={{ color: "#70787b", marginBottom: 20, fontSize: "0.875rem" }}>Send a message to all your contacts at once.</p>
              <button onClick={() => setShowNew(true)} style={{ background: "#00333c", color: "#fff", border: "none", borderRadius: 9999, padding: "12px 24px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
                Create your first broadcast
              </button>
            </div>
          ) : (
            broadcasts.map(bc => {
              const statusCfg = STATUS_STYLE[bc.status] || STATUS_STYLE.draft;
              return (
                <div key={bc.id} style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 10, border: "1px solid #e1e3e3", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: statusCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: statusCfg.color, fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>{statusCfg.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#00333c", margin: 0, fontSize: "0.95rem" }}>{bc.name}</p>
                      <span style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, flexShrink: 0, marginLeft: 8 }}>{bc.status}</span>
                    </div>
                    <p style={{ color: "#70787b", fontSize: "0.8rem", margin: "0 0 6px" }}>
                      {bc.agent?.name} · {bc.sentCount || 0} sent · {new Date(bc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 20px", borderRadius: 16, textDecoration: "none", background: "transparent", color: "#40484a" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardShell>
  );
}
