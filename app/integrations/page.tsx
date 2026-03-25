"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface ConnectionStatus {
  google: { signedIn: boolean; calendar: boolean };
  facebook: { signedIn: boolean };
  instagram?: { connected: boolean; username?: string };
  whatsapp: { connected: boolean; phone?: string };
}

const INTEGRATIONS = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Receive and send customer messages through WhatsApp",
    icon: "chat",
    iconColor: "#006d2f",
    iconBg: "rgba(93,253,138,0.15)",
    category: "messaging",
    href: "/number",
    required: true,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    desc: "Allow customers to book appointments with natural language",
    icon: "calendar_month",
    iconColor: "#1a73e8",
    iconBg: "rgba(26,115,232,0.1)",
    category: "productivity",
    href: null,
  },
  {
    id: "shopify",
    name: "Shopify",
    desc: "Let AI sell products and sync inventory in real-time",
    icon: "shopping_cart",
    iconColor: "#5c6ac4",
    iconBg: "rgba(92,106,196,0.1)",
    category: "ecommerce",
    href: null,
    comingSoon: true,
  },
  {
    id: "stripe",
    name: "Stripe Payments",
    desc: "Process payments and subscriptions through the AI interface",
    icon: "payments",
    iconColor: "#635bff",
    iconBg: "rgba(99,91,255,0.1)",
    category: "payments",
    href: null,
    comingSoon: true,
  },
  {
    id: "reloadly",
    name: "Reloadly Top-ups",
    desc: "Send mobile airtime and data bundles worldwide via AI",
    icon: "phone_iphone",
    iconColor: "#e67e22",
    iconBg: "rgba(230,126,34,0.1)",
    category: "telecom",
    href: null,
    comingSoon: true,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    desc: "Automate subscriber list updates and campaign reporting",
    icon: "mail",
    iconColor: "#ffbe00",
    iconBg: "rgba(255,190,0,0.1)",
    category: "marketing",
    href: null,
    comingSoon: true,
  },
  {
    id: "zendesk",
    name: "Zendesk CRM",
    desc: "Connect support tickets to AI workflows",
    icon: "support_agent",
    iconColor: "#03363d",
    iconBg: "rgba(3,54,61,0.1)",
    category: "crm",
    href: null,
    comingSoon: true,
  },
  {
    id: "custom",
    name: "Custom Webhook",
    desc: "Build your own private plugin via API",
    icon: "code",
    iconColor: "#40484a",
    iconBg: "#f2f4f4",
    category: "developer",
    href: null,
    comingSoon: true,
  },
];

export default function IntegrationsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/sign-in"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/connections").then(r => r.json()).catch(() => ({})),
      fetch("/api/whatsapp/connect").then(r => r.json()).catch(() => ({})),
    ]).then(([connData, waData]) => {
      setConnections({
        google: connData?.google || { signedIn: false, calendar: false },
        facebook: connData?.facebook || { signedIn: false },
        instagram: connData?.instagram,
        whatsapp: { connected: waData?.connected || false, phone: waData?.display_phone_number },
      });
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const isConnected = (id: string): boolean => {
    if (!connections) return false;
    switch (id) {
      case "whatsapp": return connections.whatsapp.connected;
      case "google_calendar": return connections.google.calendar;
      default: return false;
    }
  };

  const filtered = INTEGRATIONS.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())
  );

  if (!isLoaded || !isSignedIn) return null;

  const connectedCount = INTEGRATIONS.filter(i => isConnected(i.id)).length;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Toolbox</h1>
          <Link href="/dashboard" style={{ color: "#40484a", fontSize: "0.875rem", textDecoration: "none" }}>Home</Link>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* Header */}
          <section style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "#00333c", letterSpacing: "-0.03em", marginBottom: 8 }}>Toolbox Store</h1>
            <p style={{ color: "#40484a", fontSize: "1rem", lineHeight: 1.6, maxWidth: 520, marginBottom: 20 }}>
              Extend your AI agent's capabilities with professional-grade integrations.
            </p>
            {/* Search */}
            <div style={{ position: "relative", maxWidth: 480 }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#70787b", fontSize: 20 }}>search</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search integrations..."
                style={{ width: "100%", background: "#fff", border: "1px solid #e1e3e3", borderRadius: 12, padding: "12px 14px 12px 44px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
            </div>
          </section>

          {/* Categories pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
            {["All", "Messaging", "Payments", "eCommerce", "CRM", "Productivity"].map((cat, i) => (
              <button key={cat} style={{ padding: "8px 18px", borderRadius: 9999, border: "1px solid #e1e3e3", background: i === 0 ? "#00333c" : "#fff", color: i === 0 ? "#fff" : "#40484a", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
            {filtered.map(integration => {
              const connected = isConnected(integration.id);
              return (
                <div key={integration.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e1e3e3", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "box-shadow 0.2s" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(25,28,29,0.08)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: integration.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ color: integration.iconColor, fontSize: 26, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>{integration.icon}</span>
                      </div>
                      {connected && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(93,253,138,0.2)", padding: "3px 10px", borderRadius: 9999 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5dfd8a", animation: "bff-pulse 2s infinite" }} />
                          <span style={{ color: "#006d2f", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Active</span>
                        </div>
                      )}
                      {integration.comingSoon && (
                        <span style={{ background: "#f2f4f4", color: "#70787b", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 9999 }}>Soon</span>
                      )}
                    </div>
                    <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#00333c", margin: "0 0 6px" }}>{integration.name}</h3>
                    <p style={{ color: "#40484a", fontSize: "0.8rem", lineHeight: 1.5, margin: "0 0 20px" }}>{integration.desc}</p>
                  </div>

                  {integration.comingSoon ? (
                    <button disabled style={{ width: "100%", background: "#f2f4f4", color: "#70787b", border: "none", borderRadius: 10, padding: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "not-allowed" }}>
                      Coming Soon
                    </button>
                  ) : connected ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {integration.href ? (
                        <Link href={integration.href} style={{ flex: 1, background: "#00333c", color: "#fff", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
                          Manage
                        </Link>
                      ) : (
                        <button style={{ flex: 1, background: "#00333c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
                          Manage
                        </button>
                      )}
                    </div>
                  ) : (
                    integration.href ? (
                      <Link href={integration.href} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(0,75,87,0.08)", color: "#004B57", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", textDecoration: "none" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_link</span>
                        {integration.required ? "Connect" : "Configure"}
                      </Link>
                    ) : (
                      <button onClick={() => toast.info(`${integration.name} integration coming soon`)}
                        style={{ width: "100%", background: "rgba(0,75,87,0.06)", color: "#004B57", border: "none", borderRadius: 10, padding: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                        Configure
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
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
