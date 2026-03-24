"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Bot, Check, Zap, Building2, Phone, ArrowLeft, Star } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try it out",
    icon: <Bot className="w-5 h-5" />,
    badge: null,
    features: [
      "1 AI agent",
      "50 messages/day",
      "WhatsApp integration",
      "Reminders & bills tracking",
      "Basic to-do list",
      "Text-only conversations",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Voice calling + more agents",
    icon: <Zap className="w-5 h-5 text-[#E2725B]" />,
    badge: "Most Popular",
    features: [
      "3 AI agents",
      "500 messages/day",
      "📞 Voice calling with DID",
      "WhatsApp + Instagram",
      "Google Calendar sync",
      "Custom personality",
      "Broadcasts (up to 500)",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For teams & growing businesses",
    icon: <Building2 className="w-5 h-5 text-yellow-500" />,
    badge: null,
    features: [
      "Unlimited AI agents",
      "Unlimited messages",
      "📞 Voice calling for all agents",
      "All integrations",
      "Team collaboration",
      "Custom branding",
      "API access",
      "Dedicated support",
    ],
    cta: "Upgrade to Business",
    highlight: false,
  },
]

export default function UpgradePage() {
  const { user } = useUser()
  const [currentPlan, setCurrentPlan] = useState<string>("free")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/agent")
      .then(r => r.json())
      .then(data => {
        // Pull plan from user record
      })
      .catch(() => {})

    // Get current plan from user metadata or API
    fetch("/api/billing/plan")
      .then(r => r.json())
      .then(data => { if (data.plan) setCurrentPlan(data.plan) })
      .catch(() => {})
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") return
    setLoading(planId)
    setError("")
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || "Failed to start checkout. Please try again.")
      }
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(null)
    }
  }

  const planOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#E2725B] to-[#D4A373] flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">EPIC AI</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Choose your plan</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Upgrade anytime. Cancel anytime. Your AI keeps working either way.
          </p>

          {/* Voice calling callout */}
          <div className="mt-6 inline-flex items-center gap-2 bg-[#E2725B]/100/10 border border-indigo-500/30 rounded-full px-4 py-2 text-sm text-[#E2725B] dark:text-[#E2725B]">
            <Phone className="w-4 h-4" />
            Pro unlocks voice calling — dial out & receive calls in your browser
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isDowngrade = planOrder[plan.id] < planOrder[currentPlan]
            const isHigher = planOrder[plan.id] > planOrder[currentPlan]

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
                    : ""
                } ${isCurrent ? "border-green-500" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#E2725B] text-white text-xs px-3 py-1">
                      <Star className="w-3 h-3 mr-1 inline" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600 text-white text-xs">Current Plan</Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-muted">{plan.icon}</div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      ✓ Current Plan
                    </Button>
                  ) : isDowngrade ? (
                    <Button variant="ghost" disabled className="w-full text-muted-foreground">
                      Downgrade not available
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.highlight ? "bg-[#E2725B] hover:bg-[#E2725B]/100 text-white" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={!!loading}
                    >
                      {loading === plan.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Processing...
                        </span>
                      ) : plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            🔒 Payments secured by Fiserv · Cancel anytime · Upgrade takes effect immediately
          </p>
          <p className="text-xs text-muted-foreground">
            Pro & Business plans auto-provision a dedicated phone number (DID) for your agents
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[#E2725B] hover:text-[#E2725B] mt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
