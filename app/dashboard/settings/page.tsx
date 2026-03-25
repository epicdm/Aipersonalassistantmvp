"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface AgentData {
  id: string;
  name: string;
  template: string;
  status: string;
  ownerPhone: string | null;
  activationCode: string | null;
  whatsappStatus: string;
  inboundRouting: string;
  config: any;
}

interface PlanData {
  plan: string;
}

const WA_NUMBER = "+17672950333";

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [plan, setPlan] = useState<PlanData>({ plan: "free" });
  const [routing, setRouting] = useState("whatsapp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/agent").then(r => r.json()).catch(() => ({})),
      fetch("/api/billing/plan").then(r => r.json()).catch(() => ({ plan: "free" })),
    ]).then(([agentData, planData]) => {
      const a = agentData?.agent || agentData;
      setAgent(a?.id ? a : null);
      setPlan(planData);
      if (a?.inboundRouting) setRouting(a.inboundRouting);
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const copyCode = () => {
    if (!agent?.activationCode) return;
    navigator.clipboard.writeText(agent.activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveRouting = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent/routing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboundRouting: routing }),
      });
      if (res.ok) toast.success("Routing saved");
      else toast.error("Failed to save");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const disconnectWA = async () => {
    if (!agent || !confirm("Disconnect WhatsApp? Your agent will stop receiving messages.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _update: true, agentId: agent.id, ownerPhone: null }),
      });
      if (res.ok) {
        toast.success("WhatsApp disconnected");
        setAgent(a => a ? { ...a, ownerPhone: null } : null);
      }
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    free:     { label: "Free",     color: "#70787b", bg: "#f2f4f4" },
    pro:      { label: "Pro",      color: "#004B57", bg: "rgba(0,75,87,0.1)" },
    business: { label: "Business", color: "#006d2f", bg: "rgba(93,253,138,0.15)" },
  };
  const planInfo = PLAN_LABELS[plan.plan] || PLAN_LABELS.free;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>

        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Settings</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/dashboard" style={{ color: "#40484a", fontSize: "0.875rem", textDecoration: "none" }}>Home</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 100px" }}>

          {/* Account */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Account</h2>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e1e3e3", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                <UserButton afterSignOutUrl="/" />
                <div>
                  <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.95rem" }}>
                    {user?.fullName || user?.emailAddresses[0]?.emailAddress}
                  </p>
                  <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0 }}>
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", background: planInfo.bg, color: planInfo.color, padding: "4px 10px", borderRadius: 9999, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {planInfo.label}
                </div>
              </div>
              {plan.plan === "free" && (
                <div style={{ borderTop: "1px solid #e1e3e3", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
                  <p style={{ color: "#40484a", fontSize: "0.85rem", margin: 0 }}>Upgrade for unlimited messages + voice</p>
                  <Link href="/upgrade" style={{ background: "#00333c", color: "#fff", padding: "8px 16px", borderRadius: 9999, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                    Upgrade
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* WhatsApp */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>WhatsApp Connection</h2>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e1e3e3", overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 24 }}>
                  <div style={{ height: 20, background: "#e1e3e3", borderRadius: 8, width: "60%", animation: "bff-pulse 2s infinite" }} />
                </div>
              ) : !agent ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "#70787b", marginBottom: 16 }}>Create an agent first to connect WhatsApp.</p>
                  <Link href="/create" style={{ background: "#00333c", color: "#fff", padding: "10px 20px", borderRadius: 9999, fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>Create Agent</Link>
                </div>
              ) : agent.ownerPhone ? (
                <>
                  <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(93,253,138,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "#006d2f", fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px" }}>WhatsApp Connected</p>
                      <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0 }}>{agent.ownerPhone} → {agent.name}</p>
                    </div>
                    <button onClick={disconnectWA} disabled={saving}
                      style={{ marginLeft: "auto", background: "none", border: "1px solid #e1e3e3", color: "#ba1a1a", borderRadius: 10, padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: 20 }}>warning</span>
                      <p style={{ color: "#40484a", fontSize: "0.875rem", margin: 0 }}>WhatsApp not connected. Activate your agent:</p>
                    </div>
                    {agent.activationCode ? (
                      <>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          <div style={{ flex: 1, background: "rgba(93,253,138,0.1)", border: "1px solid rgba(93,253,138,0.3)", borderRadius: 12, padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "#00333c", letterSpacing: "0.15em", textAlign: "center", fontSize: "1.1rem" }}>
                            {agent.activationCode}
                          </div>
                          <button onClick={copyCode} style={{ width: 48, background: "#f2f4f4", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: copied ? "#006d2f" : "#40484a" }}>{copied ? "check" : "content_copy"}</span>
                          </button>
                        </div>
                        <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0 }}>
                          Text this code to{" "}
                          <a href={`https://wa.me/17672950333?text=${agent.activationCode}`} target="_blank" rel="noreferrer" style={{ color: "#006d2f", fontWeight: 600 }}>
                            {WA_NUMBER}
                          </a>{" "}
                          on WhatsApp to activate {agent.name}.
                        </p>
                      </>
                    ) : (
                      <Link href="/number" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00333c", color: "#fff", padding: "10px 20px", borderRadius: 9999, fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
                        Set up WhatsApp <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Call Routing */}
          {agent && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Inbound Call Routing</h2>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e1e3e3", padding: 24 }}>
                <p style={{ color: "#40484a", fontSize: "0.875rem", marginBottom: 16 }}>How should inbound calls be handled?</p>
                {[
                  { value: "whatsapp", icon: "chat", label: "WhatsApp only", desc: "Text-only, no call handling" },
                  { value: "voice_agent", icon: "smart_toy", label: "AI Voice Agent", desc: "AI answers calls automatically" },
                  { value: "ai", icon: "phone_forwarded", label: "Forward to AI then human", desc: "AI first, escalate if needed" },
                ].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: `1px solid ${routing === opt.value ? "rgba(0,75,87,0.4)" : "#e1e3e3"}`, background: routing === opt.value ? "rgba(0,75,87,0.05)" : "#fff", marginBottom: 8, cursor: "pointer" }}>
                    <input type="radio" value={opt.value} checked={routing === opt.value} onChange={() => setRouting(opt.value)} style={{ accentColor: "#004B57" }} />
                    <span className="material-symbols-outlined" style={{ color: routing === opt.value ? "#004B57" : "#bfc8ca", fontSize: 20 }}>{opt.icon}</span>
                    <div>
                      <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.875rem" }}>{opt.label}</p>
                      <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
                <button onClick={saveRouting} disabled={saving}
                  style={{ width: "100%", marginTop: 8, background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? "hourglass_empty" : "save"}</span>
                  {saving ? "Saving..." : "Save Routing"}
                </button>
              </div>
            </section>
          )}

          {/* Platform status */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Platform Status</h2>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e1e3e3", overflow: "hidden" }}>
              {[
                { label: "WhatsApp Webhook", status: "operational" },
                { label: "AI Engine", status: "operational" },
                { label: "Voice Bridge", status: "operational" },
                { label: "Database", status: "operational" },
              ].map((svc, i) => (
                <div key={svc.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: i < 3 ? "1px solid #f2f4f4" : "none" }}>
                  <span style={{ color: "#40484a", fontSize: "0.875rem" }}>{svc.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#5dfd8a", animation: "bff-pulse 2s infinite" }} />
                    <span style={{ color: "#006d2f", fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize" }}>{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#ba1a1a", marginBottom: 12 }}>Danger Zone</h2>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(186,26,26,0.2)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.875rem" }}>Sign out</p>
                <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0 }}>Sign out of your BFF account</p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </section>
        </main>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings", active: true },
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
