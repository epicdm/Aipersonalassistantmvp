"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface KnowledgeSource {
  id: string;
  type: string;
  name: string;
  content?: string;
  url?: string;
  embedStatus: string;
  createdAt: string;
  agent: { name: string };
}

interface Agent { id: string; name: string; }

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  text:     { icon: "article",       color: "#004B57", label: "Text" },
  url:      { icon: "language",      color: "#006d2f", label: "Website" },
  faq:      { icon: "help",          color: "#b45309", label: "FAQ" },
  product:  { icon: "inventory_2",   color: "#7c3aed", label: "Product" },
  file:     { icon: "upload_file",   color: "#0369a1", label: "File" },
};

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  pending:   { color: "#b45309", label: "Processing" },
  ready:     { color: "#006d2f", label: "Ready" },
  error:     { color: "#ba1a1a", label: "Error" },
};

export default function KnowledgePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ agentId: "", type: "text", name: "", content: "", url: "" });

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/sign-in"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/knowledge").then(r => r.json()).catch(() => ({ sources: [] })),
      fetch("/api/agent?all=true").then(r => r.json()).catch(() => ({ agents: [] })),
    ]).then(([kData, aData]) => {
      setSources(Array.isArray(kData?.sources) ? kData.sources : []);
      const agentList = Array.isArray(aData?.agents) ? aData.agents : aData?.agent ? [aData.agent] : [];
      setAgents(agentList);
      if (agentList[0]) setForm(f => ({ ...f, agentId: agentList[0].id }));
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const addSource = async () => {
    if (!form.name.trim() || !form.agentId) { toast.error("Name and agent are required"); return; }
    if (form.type === "url" && !form.url.trim()) { toast.error("URL is required"); return; }
    if (form.type === "text" && !form.content.trim()) { toast.error("Content is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: form.agentId, type: form.type, name: form.name, content: form.content, url: form.url }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Knowledge source added");
        setSources(prev => [data.source, ...prev]);
        setShowAdd(false);
        setForm(f => ({ ...f, name: "", content: "", url: "" }));
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Remove this knowledge source?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Removed"); setSources(prev => prev.filter(s => s.id !== id)); }
      else toast.error("Failed to remove");
    } catch { toast.error("Failed"); }
    finally { setDeleting(null); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const readyCount = sources.filter(s => s.embedStatus === "ready").length;
  const readyPct = sources.length > 0 ? Math.round((readyCount / sources.length) * 100) : 0;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Knowledge</h1>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#00333c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Source
          </button>
        </header>

        <main style={{ maxWidth: 700, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* Stats */}
          {sources.length > 0 && (
            <div style={{ background: "linear-gradient(135deg,#00333c,#004B57)", borderRadius: 16, padding: 24, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Knowledge Readiness</p>
                <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#fff", margin: 0 }}>{readyPct}% Ready</h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", margin: "4px 0 0" }}>{readyCount} of {sources.length} sources indexed</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(93,253,138,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#5dfd8a", fontSize: 28, fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24" }}>auto_stories</span>
                </div>
              </div>
            </div>
          )}

          {/* Add form */}
          {showAdd && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e1e3e3", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#00333c", marginBottom: 20 }}>Add Knowledge Source</h3>

              {/* Type selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, border: `1px solid ${form.type === key ? "#004B57" : "#e1e3e3"}`, background: form.type === key ? "rgba(0,75,87,0.08)" : "#fff", color: form.type === key ? "#004B57" : "#70787b", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cfg.icon}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>

              {agents.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Agent</label>
                  <select value={form.agentId} onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none" }}>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Product Catalog, FAQ, About Us"
                  style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
              </div>

              {form.type === "url" ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>URL</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://your-website.com/faq"
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Content</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Paste your content here — product descriptions, FAQs, policies, business info..."
                    rows={5}
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addSource} disabled={saving}
                  style={{ flex: 1, background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Adding..." : "Add to Knowledge Base"}
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ width: 48, background: "#f2f4f4", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#40484a" }}>close</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Sources */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", margin: 0 }}>
              Active Sources ({sources.length})
            </h2>
          </div>

          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ height: 76, borderRadius: 14, background: "#e1e3e3", marginBottom: 8, animation: "bff-pulse 2s infinite" }} />)
          ) : sources.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "#bfc8ca", display: "block", marginBottom: 14 }}>auto_stories</span>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#00333c", marginBottom: 8 }}>No knowledge sources</h3>
              <p style={{ color: "#70787b", marginBottom: 24, fontSize: "0.875rem" }}>Add text, FAQs, or website URLs to teach your AI about your business.</p>
              <button onClick={() => setShowAdd(true)} style={{ background: "#00333c", color: "#fff", border: "none", borderRadius: 9999, padding: "12px 24px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
                Add your first source
              </button>
            </div>
          ) : (
            sources.map(src => {
              const typeCfg = TYPE_CONFIG[src.type] || TYPE_CONFIG.text;
              const statusCfg = STATUS_STYLE[src.embedStatus] || STATUS_STYLE.pending;
              return (
                <div key={src.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 8, border: "1px solid #e1e3e3", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(0,75,87,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: typeCfg.color, fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>{typeCfg.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#00333c", margin: 0, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.name}</p>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: statusCfg.color, flexShrink: 0 }}>{statusCfg.label}</span>
                    </div>
                    <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>{typeCfg.label} · {src.agent.name} · {new Date(src.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => deleteSource(src.id)} disabled={deleting === src.id}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: deleting === src.id ? 0.5 : 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#bfc8ca" }}>delete</span>
                  </button>
                </div>
              );
            })
          )}

          {/* Tips */}
          {sources.length > 0 && (
            <div style={{ background: "rgba(0,75,87,0.05)", borderRadius: 14, padding: 18, marginTop: 16, border: "1px solid rgba(0,75,87,0.1)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="material-symbols-outlined" style={{ color: "#004B57", fontSize: 20, flexShrink: 0 }}>tips_and_updates</span>
                <div>
                  <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 4px", fontSize: "0.875rem" }}>Expand Intelligence</p>
                  <p style={{ color: "#40484a", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>Add more sources to improve your agent's accuracy. Include product info, pricing, business hours, and FAQs.</p>
                </div>
              </div>
            </div>
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
