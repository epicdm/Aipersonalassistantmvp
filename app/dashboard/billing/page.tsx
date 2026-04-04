"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Bill {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

interface PlanData {
  plan: string;
  pendingPlan: string | null;
}

const PLAN_FEATURES: Record<string, { label: string; messages: string; agents: string; price: string; color: string }> = {
  free:     { label: "Free",     messages: "100/mo",      agents: "1",         price: "$0/mo",   color: "#70787b" },
  pro:      { label: "Pro",      messages: "5,000/mo",    agents: "3",         price: "$29/mo",  color: "#004B57" },
  business: { label: "Business", messages: "Unlimited",   agents: "Unlimited", price: "$99/mo",  color: "#006d2f" },
};

export default function BillingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanData>({ plan: "free", pendingPlan: null });
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/billing/plan").then(r => r.json()).catch(() => ({ plan: "free" })),
      fetch("/api/bills").then(r => r.json()).catch(() => ({ bills: [] })),
    ]).then(([planData, billData]) => {
      setPlan(planData);
      setBills(Array.isArray(billData?.bills) ? billData.bills : []);
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const handleUpgrade = async (targetPlan: string) => {
    setUpgrading(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.ok) {
        toast.success(`Upgraded to ${targetPlan}`);
        setPlan(p => ({ ...p, plan: targetPlan }));
      } else {
        toast.error(data.error || "Upgrade failed");
      }
    } catch { toast.error("Upgrade failed"); }
    finally { setUpgrading(null); }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not open billing portal");
      }
    } catch { toast.error("Could not open billing portal"); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const currentPlan = PLAN_FEATURES[plan.plan] || PLAN_FEATURES.free;

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>

        {/* Header */}
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Billing</h1>
          <Link href="/dashboard" style={{ color: "#40484a", fontSize: "0.875rem", textDecoration: "none" }}>Home</Link>
        </header>

        <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* Current plan */}
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Current Plan</h2>
            <div style={{ background: plan.plan === "free" ? "#fff" : "linear-gradient(135deg,#00333c,#004B57)", borderRadius: 16, padding: 24, border: plan.plan === "free" ? "1px solid #e1e3e3" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: plan.plan === "free" ? "#00333c" : "#fff", margin: "0 0 4px" }}>
                    {currentPlan.label}
                  </h3>
                  <p style={{ color: plan.plan === "free" ? "#70787b" : "rgba(255,255,255,0.7)", fontSize: "1rem", margin: 0 }}>{currentPlan.price}</p>
                </div>
                <span style={{ background: plan.plan === "free" ? "#f2f4f4" : "rgba(93,253,138,0.25)", color: plan.plan === "free" ? "#70787b" : "#5dfd8a", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 12px", borderRadius: 9999 }}>
                  Active
                </span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { icon: "chat_bubble", label: "Messages", value: currentPlan.messages },
                  { icon: "smart_toy", label: "Agents", value: currentPlan.agents },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: plan.plan === "free" ? "#004B57" : "#5dfd8a" }}>{item.icon}</span>
                    <div>
                      <p style={{ color: plan.plan === "free" ? "#70787b" : "rgba(255,255,255,0.6)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>{item.label}</p>
                      <p style={{ fontWeight: 700, color: plan.plan === "free" ? "#00333c" : "#fff", fontSize: "0.875rem", margin: 0 }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Manage Subscription */}
          {plan.plan !== "free" && (
            <section style={{ marginBottom: 28 }}>
              <button onClick={handleManageSubscription}
                style={{ width: "100%", background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e1e3e3", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 4px", fontSize: "0.875rem" }}>Manage Subscription</p>
                  <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>Update payment method, change plan, or cancel</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#70787b" }}>open_in_new</span>
              </button>
            </section>
          )}

          {/* Upgrade */}
          {plan.plan !== "business" && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Upgrade</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(PLAN_FEATURES).filter(([key]) => key !== plan.plan && key !== "free").map(([key, info]) => (
                  <div key={key} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e1e3e3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#00333c", margin: "0 0 4px", fontSize: "0.95rem" }}>{info.label} — {info.price}</p>
                      <p style={{ color: "#70787b", fontSize: "0.8rem", margin: 0 }}>{info.messages} messages · {info.agents} agents</p>
                    </div>
                    <button onClick={() => handleUpgrade(key)} disabled={upgrading === key}
                      style={{ background: "#00333c", color: "#fff", border: "none", borderRadius: 9999, padding: "10px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", opacity: upgrading === key ? 0.7 : 1, flexShrink: 0 }}>
                      {upgrading === key ? "..." : "Upgrade"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transaction history */}
          <section>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#70787b", marginBottom: 12 }}>Recent Activity</h2>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e1e3e3", overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 24 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 48, borderRadius: 8, background: "#e1e3e3", marginBottom: 8, animation: "bff-pulse 2s infinite" }} />)}
                </div>
              ) : bills.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#bfc8ca", display: "block", marginBottom: 10 }}>receipt_long</span>
                  <p style={{ color: "#70787b", fontSize: "0.875rem", margin: 0 }}>No transactions yet</p>
                </div>
              ) : (
                bills.slice(0, 10).map((bill, i) => (
                  <div key={bill.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: i < bills.length - 1 ? "1px solid #f2f4f4" : "none" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.875rem" }}>{bill.description}</p>
                      <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>{new Date(bill.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: bill.amount < 0 ? "#ba1a1a" : "#00333c", fontSize: "0.95rem" }}>
                      {bill.amount < 0 ? "-" : "+"}${Math.abs(bill.amount / 100).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Bottom nav */}
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
