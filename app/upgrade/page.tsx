"use client";

import { Bot, Check, Zap, Star, Building2, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started with AI assistance",
    icon: <Bot className="w-5 h-5" />,
    color: "border-gray-700",
    badge: null,
    buttonLabel: "Current Plan",
    buttonHref: "/dashboard",
    buttonClass: "border border-gray-700 text-gray-400 cursor-default",
    features: [
      "1 AI agent",
      "50 messages/day",
      "WhatsApp integration",
      "Reminders & bills tracking",
      "Basic to-do list",
      "Text-only conversations",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Voice calling & more agents",
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
    color: "border-indigo-600 ring-2 ring-indigo-600/30",
    badge: "Most Popular",
    buttonLabel: "Upgrade to Pro",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
    features: [
      "3 AI agents",
      "500 messages/day",
      "Voice calling with DIDs",
      "WhatsApp + Instagram",
      "Google Calendar sync",
      "Priority support",
      "Custom personality",
      "Analytics dashboard",
    ],
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For teams and growing businesses",
    icon: <Building2 className="w-5 h-5 text-yellow-400" />,
    color: "border-yellow-700",
    badge: null,
    buttonLabel: "Upgrade to Business",
    buttonClass: "bg-yellow-600 hover:bg-yellow-500 text-white",
    features: [
      "Unlimited AI agents",
      "Unlimited messages",
      "Voice calling for all agents",
      "All integrations",
      "Team collaboration",
      "Dedicated support",
      "Custom branding",
      "API access",
      "Advanced analytics",
    ],
  },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redirect to Fiserv checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">BFF</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">Choose your plan</h1>
        <p className="text-gray-400 max-w-md mx-auto text-sm">
          Unlock more power for your AI assistant. Upgrade anytime, cancel anytime.
        </p>
        
        {/* Voice calling hero feature */}
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-indigo-600">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Voice Calling Now Available!</h2>
            </div>
            <p className="text-gray-300 text-sm">
              Upgrade to <span className="font-semibold text-indigo-300">Pro</span> or <span className="font-semibold text-yellow-300">Business</span> to get dedicated phone numbers (DIDs) for your agents. 
              Customers can call your AI assistant directly - perfect for sales, support, and follow-ups.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-full max-w-4xl">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-gray-900 rounded-2xl border p-6 flex flex-col ${plan.color}`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> {plan.badge}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gray-800">{plan.icon}</div>
              <h2 className="font-bold text-white">{plan.name}</h2>
            </div>

            <div className="mb-2">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-gray-500 text-sm">{plan.period}</span>
            </div>
            <p className="text-xs text-gray-500 mb-5">{plan.description}</p>

            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.name === "Free" ? (
              <a href={plan.buttonHref}>
                <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.buttonClass}`}>
                  {plan.buttonLabel}
                </button>
              </a>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.name.toLowerCase())}
                disabled={loading === plan.name.toLowerCase()}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.name.toLowerCase() ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  plan.buttonLabel
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-600">
        All plans include a 14-day free trial. No credit card required.{" "}
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300">
          Back to dashboard →
        </Link>
      </p>
      
      <div className="mt-6 text-center text-xs text-gray-500 max-w-2xl">
        <p>🔒 Secured by Fiserv · Your payment is processed securely · Cancel anytime</p>
        <p className="mt-1">Upgrading to Pro or Business automatically provisions phone numbers (DIDs) for your active agents</p>
      </div>
    </div>
  );
}
