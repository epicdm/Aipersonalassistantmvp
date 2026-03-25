"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface RoutingData {
  inboundRouting: string;
  didNumber: string | null;
}

interface Agent {
  id: string;
  name: string;
  didNumber?: string;
  didSipServer?: string;
  config?: any;
}

export default function CallsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [routing, setRouting] = useState<RoutingData>({ inboundRouting: "whatsapp", didNumber: null });
  const [agent, setAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [pbxExtension, setPbxExtension] = useState("");
  const [fallbackNumber, setFallbackNumber] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/sign-in"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/agent/routing").then(r => r.json()).catch(() => ({})),
      fetch("/api/agent").then(r => r.json()).catch(() => ({})),
    ]).then(([routingData, agentData]) => {
      setRouting(routingData);
      const a = agentData?.agent || agentData;
      if (a?.id) {
        setAgent(a);
        const cfg = a.config?.callRouting || {};
        setPbxExtension(cfg.sipExtension || a.didSipServer || "");
        setFallbackNumber(cfg.destination || "");
        setVoiceEnabled(cfg.voiceAgentEnabled ?? routingData.inboundRouting === "voice_agent");
      }
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const saveRouting = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          inboundRouting: voiceEnabled ? "voice_agent" : "whatsapp",
          callRouting: { voiceAgentEnabled: voiceEnabled, sipExtension: pbxExtension, destination: fallbackNumber, enabled: voiceEnabled },
        }),
      });
      if (res.ok) toast.success("Call routing saved");
      else toast.error("Failed to save");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const startCall = async () => {
    if (!dialNumber.trim()) { toast.error("Enter a number to call"); return; }
    setCalling(true);
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: dialNumber, agentId: agent?.id }),
      });
      const data = await res.json();
      if (data.lkToken) {
        toast.success("Call connecting...");
      } else {
        toast.error(data.error || "Call failed");
      }
    } catch { toast.error("Call failed"); }
    finally { setCalling(false); }
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Voice & Calls</h1>
          <Link href="/dashboard" style={{ color: "#40484a", fontSize: "0.875rem", textDecoration: "none" }}>Home</Link>
        </header>

        <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* Current status */}
          <div style={{ background: voiceEnabled ? "linear-gradient(135deg,#00333c,#004B57)" : "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: voiceEnabled ? "none" : "1px solid #e1e3e3" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: voiceEnabled ? "#5dfd8a" : "#004B57", fontSize: 24, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>phone</span>
                <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: voiceEnabled ? "#fff" : "#00333c", margin: 0 }}>
                  {voiceEnabled ? "AI Voice Active" : "Voice Disabled"}
                </h2>
              </div>
              {routing.didNumber && (
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: voiceEnabled ? "rgba(255,255,255,0.7)" : "#70787b", fontWeight: 600 }}>{routing.didNumber}</span>
              )}
            </div>
            <p style={{ color: voiceEnabled ? "rgba(255,255,255,0.7)" : "#70787b", fontSize: "0.85rem", margin: 0 }}>
              {voiceEnabled ? "Inbound calls are answered by your AI voice agent automatically." : "Enable AI voice to have your agent answer inbound calls."}
            </p>
          </div>

          {/* Outbound dialer */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Make a Call</h2>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e1e3e3" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#70787b", fontSize: 18 }}>phone</span>
                  <input value={dialNumber} onChange={e => setDialNumber(e.target.value)}
                    placeholder="+1 767 555 1234"
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "12px 14px 12px 42px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={startCall} disabled={calling || !dialNumber.trim()}
                  style={{ background: "#006d2f", color: "#fff", border: "none", borderRadius: 10, padding: "0 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: calling || !dialNumber.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>call</span>
                  {calling ? "Calling..." : "Call"}
                </button>
              </div>
            </div>
          </section>

          {/* Routing config */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Inbound Call Routing</h2>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e1e3e3" }}>

              {/* AI Voice toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, border: `1px solid ${voiceEnabled ? "rgba(0,75,87,0.3)" : "#e1e3e3"}`, background: voiceEnabled ? "rgba(0,75,87,0.05)" : "#fafafa", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>smart_toy</span>
                  <div>
                    <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.875rem" }}>AI Voice Agent First</p>
                    <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>AI answers automatically. Same context as text agent.</p>
                  </div>
                </div>
                <button onClick={() => setVoiceEnabled(v => !v)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: voiceEnabled ? "#004B57" : "#e1e3e3", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: 2, left: voiceEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>

              {/* PBX Extension */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  PBX Extension <span style={{ color: "#bfc8ca", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#70787b", fontSize: 18 }}>dialpad</span>
                  <input value={pbxExtension} onChange={e => setPbxExtension(e.target.value)}
                    placeholder="e.g. 201"
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px 10px 42px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
                </div>
                <p style={{ color: "#bfc8ca", fontSize: "0.72rem", margin: "4px 0 0" }}>Route to this PBX extension after (or instead of) AI agent</p>
              </div>

              {/* Fallback number */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Human Fallback <span style={{ color: "#bfc8ca", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#70787b", fontSize: 18 }}>person</span>
                  <input value={fallbackNumber} onChange={e => setFallbackNumber(e.target.value)}
                    placeholder="+17675551234"
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px 10px 42px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
                </div>
                <p style={{ color: "#bfc8ca", fontSize: "0.72rem", margin: "4px 0 0" }}>Transfer here when AI can't handle the call</p>
              </div>

              {/* Flow summary */}
              <div style={{ background: "#f2f4f4", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 16 }}>arrow_forward</span>
                <span style={{ fontSize: "0.8rem", color: "#40484a" }}>
                  Inbound → {voiceEnabled ? <strong style={{ color: "#004B57" }}>AI Voice Agent</strong> : <span>WhatsApp text only</span>}
                  {pbxExtension && <> → <strong style={{ color: "#b45309" }}>ext. {pbxExtension}</strong></>}
                  {fallbackNumber && <> → <strong style={{ color: "#006d2f" }}>{fallbackNumber}</strong></>}
                </span>
              </div>

              <button onClick={saveRouting} disabled={saving || loading}
                style={{ width: "100%", background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? "hourglass_empty" : "save"}</span>
                {saving ? "Saving..." : "Save Call Routing"}
              </button>
            </div>
          </section>

          {/* Voice number */}
          {routing.didNumber && (
            <section>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Your Voice Number</h2>
              <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e1e3e3", display: "flex", alignItems: "center", gap: 12 }}>
                <span className="material-symbols-outlined" style={{ color: "#006d2f", fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>phone_in_talk</span>
                <div>
                  <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", color: "#00333c", margin: "0 0 2px" }}>{routing.didNumber}</p>
                  <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>Dedicated voice number</p>
                </div>
              </div>
            </section>
          )}

          {!routing.didNumber && !loading && (
            <section>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px dashed #e1e3e3", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#bfc8ca", display: "block", marginBottom: 10 }}>phone_missed</span>
                <p style={{ fontWeight: 600, color: "#00333c", marginBottom: 6 }}>No voice number yet</p>
                <p style={{ color: "#70787b", fontSize: "0.8rem", marginBottom: 16 }}>Get a dedicated number for inbound calls.</p>
                <Link href="/number" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#00333c", color: "#fff", padding: "10px 20px", borderRadius: 9999, fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
                  Get a number <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
              </div>
            </section>
          )}
        </main>

        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 20px", borderRadius: 16, textDecoration: "none", color: "#40484a" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardShell>
  );
}
