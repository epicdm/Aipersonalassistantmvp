"use client";

import { useEffect, useState } from "react";
import { Crown, Zap, Building2, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    color: "zinc",
    icon: Zap,
    features: [
      "1 AI agent",
      "50 messages / day",
      "WhatsApp connection",
      "Talk to Jenny (AI voice, free)",
      "Basic reminders & bills",
    ],
    cta: "Current Plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/ month",
    color: "indigo",
    icon: Crown,
    popular: true,
    features: [
      "3 AI agents",
      "Unlimited messages",
      "PSTN voice calls + DID number",
      "Broadcasts (up to 500 contacts)",
      "Call routing control",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/ month",
    color: "violet",
    icon: Building2,
    features: [
      "Unlimited agents",
      "Unlimited messages",
      "Multiple DID numbers",
      "Unlimited broadcasts",
      "Custom AI personality",
      "Dedicated support",
    ],
    cta: "Upgrade to Business",
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then((data) => { setCurrentPlan(data.plan || "free"); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan || planId === "free") return;
    setCheckingOut(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to start checkout");
    } catch {
      alert("Failed to start checkout");
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Billing</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {loading ? "Loading..." : `You're on the `}
          {!loading && (
            <span className="text-indigo-400 font-semibold capitalize">{currentPlan}</span>
          )}
          {!loading && " plan"}
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.popular;

          return (
            <div key={plan.id} className={`relative bg-zinc-900 rounded-2xl p-6 flex flex-col border transition-all ${
              isCurrent
                ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                : isPopular
                ? "border-indigo-500/30"
                : "border-zinc-800"
            }`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  plan.id === "pro" ? "bg-indigo-500/20" : plan.id === "business" ? "bg-violet-500/20" : "bg-zinc-800"
                }`}>
                  <Icon className={`w-4 h-4 ${
                    plan.id === "pro" ? "text-indigo-400" : plan.id === "business" ? "text-violet-400" : "text-zinc-400"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-100">{plan.name}</p>
                  {isCurrent && (
                    <span className="text-[10px] text-green-400">● Current plan</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <span className="text-3xl font-black text-zinc-100 font-mono">{plan.price}</span>
                <span className="text-xs text-zinc-500 ml-1">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || plan.id === "free" || checkingOut === plan.id}
                className={`w-full ${
                  isCurrent || plan.id === "free"
                    ? "bg-zinc-800 text-zinc-500 cursor-default"
                    : plan.id === "pro"
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 shadow-md shadow-indigo-500/20"
                    : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30"
                }`}
              >
                {checkingOut === plan.id ? "Loading..." : isCurrent ? "Current Plan" : (
                  <span className="flex items-center gap-1">{plan.cta} <ArrowRight className="w-3.5 h-3.5" /></span>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <p className="text-xs text-zinc-600 text-center">
        Payments processed securely via Fiserv. Cancel anytime. No hidden fees.
      </p>
    </div>
  );
}
