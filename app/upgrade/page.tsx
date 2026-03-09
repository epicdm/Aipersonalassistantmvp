import { Bot, Check, Zap, Star, Building2 } from "lucide-react";
import Link from "next/link";

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
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For power users who need more",
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
    color: "border-indigo-600 ring-2 ring-indigo-600/30",
    badge: "Most Popular",
    buttonLabel: "Upgrade to Pro",
    buttonHref: "/api/billing/checkout?plan=pro",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
    features: [
      "3 AI agents",
      "500 messages/day",
      "WhatsApp + Instagram",
      "Google Calendar sync",
      "Priority support",
      "Custom personality",
      "Analytics dashboard",
    ],
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For teams and growing businesses",
    icon: <Building2 className="w-5 h-5 text-yellow-400" />,
    color: "border-yellow-700",
    badge: null,
    buttonLabel: "Upgrade to Business",
    buttonHref: "/api/billing/checkout?plan=business",
    buttonClass: "bg-yellow-600 hover:bg-yellow-500 text-white",
    features: [
      "Unlimited AI agents",
      "Unlimited messages",
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

            <a href={plan.buttonHref}>
              <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.buttonClass}`}>
                {plan.buttonLabel}
              </button>
            </a>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-600">
        All plans include a 14-day free trial. No credit card required.{" "}
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300">
          Back to dashboard →
        </Link>
      </p>
    </div>
  );
}
