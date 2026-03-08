"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone, MessageSquare, Users, Settings, Calendar, DollarSign,
  FileText, MapPin, Star, Clock, TrendingUp, Bell, LogOut,
  Sparkles, Bot, ChevronRight, Send, Plus, BarChart3,
  Hotel, Headphones, Target, Wallet, ArrowRight, CheckCircle, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/app/lib/templates";
import { SignOutButton } from "@clerk/nextjs";

// ─── Template Configs ────────────────────────────────────────
const TEMPLATE_DASHBOARDS: Record<string, TemplateDashConfig> = {
  receptionist: {
    title: "Receptionist Dashboard",
    emoji: "📞",
    color: "from-blue-500 to-cyan-500",
    accent: "blue",
    stats: [
      { label: "Calls Today", value: "0", icon: Phone, color: "text-blue-400" },
      { label: "Messages Taken", value: "0", icon: MessageSquare, color: "text-green-400" },
      { label: "Appointments", value: "0", icon: Calendar, color: "text-purple-400" },
      { label: "Missed Calls", value: "0", icon: Bell, color: "text-red-400" },
    ],
    setupSteps: [
      { id: "business", label: "Business Name", placeholder: "Your business name", type: "text" },
      { id: "hours", label: "Business Hours", placeholder: "e.g. Mon-Fri 9am-5pm", type: "text" },
      { id: "services", label: "Services You Offer", placeholder: "List your services (one per line)", type: "textarea" },
      { id: "greeting", label: "Greeting Message", placeholder: "How should your agent greet callers?", type: "textarea" },
      { id: "booking_link", label: "Booking Link (optional)", placeholder: "https://calendly.com/...", type: "text" },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Overview" },
      { href: "/chat", icon: MessageSquare, label: "Messages" },
      { href: "/contacts", icon: Users, label: "Callers" },
      { href: "/whatsapp", icon: Phone, label: "WhatsApp" },
      { href: "/number", icon: Phone, label: "Phone Line" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["Auto-answer calls", "Take detailed messages", "Book appointments", "Text you summaries"],
  },
  concierge: {
    title: "Concierge Dashboard",
    emoji: "🏨",
    color: "from-emerald-500 to-teal-500",
    accent: "emerald",
    stats: [
      { label: "Guest Chats", value: "0", icon: MessageSquare, color: "text-emerald-400" },
      { label: "Recommendations", value: "0", icon: Star, color: "text-yellow-400" },
      { label: "Languages Used", value: "0", icon: MapPin, color: "text-blue-400" },
      { label: "Satisfaction", value: "—", icon: TrendingUp, color: "text-green-400" },
    ],
    setupSteps: [
      { id: "property", label: "Property Name", placeholder: "Hotel/Airbnb name", type: "text" },
      { id: "location", label: "Location", placeholder: "City, Country", type: "text" },
      { id: "attractions", label: "Top Attractions Nearby", placeholder: "Waterfalls, beaches, restaurants... (one per line)", type: "textarea" },
      { id: "checkin", label: "Check-in Instructions", placeholder: "How guests check in, WiFi password, etc.", type: "textarea" },
      { id: "languages", label: "Languages", placeholder: "English, French, Spanish...", type: "text" },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Overview" },
      { href: "/chat", icon: MessageSquare, label: "Guest Chat" },
      { href: "/knowledge", icon: MapPin, label: "Local Guide" },
      { href: "/contacts", icon: Users, label: "Guests" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["Answer guest questions 24/7", "Local recommendations", "Multi-language support", "Check-in help"],
  },
  collector: {
    title: "Collections Dashboard",
    emoji: "💰",
    color: "from-amber-500 to-orange-500",
    accent: "amber",
    stats: [
      { label: "Contacted", value: "0", icon: Phone, color: "text-amber-400" },
      { label: "Promises to Pay", value: "0", icon: CheckCircle, color: "text-green-400" },
      { label: "Collected", value: "$0", icon: DollarSign, color: "text-emerald-400" },
      { label: "Outstanding", value: "$0", icon: Wallet, color: "text-red-400" },
    ],
    setupSteps: [
      { id: "company", label: "Company Name", placeholder: "Your company name", type: "text" },
      { id: "payment_link", label: "Payment Link", placeholder: "https://pay.example.com", type: "text" },
      { id: "tone", label: "Collection Tone", placeholder: "Firm but respectful", type: "select", options: ["Firm but respectful", "Gentle reminder", "Professional and direct", "Empathetic"] },
      { id: "followup", label: "Follow-up Frequency", placeholder: "Every 3 days", type: "select", options: ["Every day", "Every 3 days", "Weekly", "Bi-weekly"] },
      { id: "csv", label: "Upload Invoice List (optional)", placeholder: "CSV with name, phone, amount, due date", type: "file" },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Overview" },
      { href: "/chat", icon: MessageSquare, label: "Conversations" },
      { href: "/contacts", icon: Users, label: "Debtors" },
      { href: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["Follow up on overdue invoices", "Negotiate payment plans", "Send payment links", "Track promises to pay"],
  },
  sales: {
    title: "Sales Dashboard",
    emoji: "🎯",
    color: "from-purple-500 to-pink-500",
    accent: "purple",
    stats: [
      { label: "Active Leads", value: "0", icon: Target, color: "text-purple-400" },
      { label: "Contacted", value: "0", icon: Send, color: "text-blue-400" },
      { label: "Meetings Booked", value: "0", icon: Calendar, color: "text-green-400" },
      { label: "Revenue", value: "$0", icon: TrendingUp, color: "text-emerald-400" },
    ],
    setupSteps: [
      { id: "company", label: "Company Name", placeholder: "Your company name", type: "text" },
      { id: "product", label: "What Do You Sell?", placeholder: "Describe your product/service", type: "textarea" },
      { id: "pricing", label: "Pricing Info", placeholder: "Starting at $X/mo, plans available...", type: "textarea" },
      { id: "calendar", label: "Booking Link (optional)", placeholder: "https://calendly.com/...", type: "text" },
      { id: "followup_style", label: "Follow-up Style", placeholder: "", type: "select", options: ["Persistent (every 2 days)", "Moderate (weekly)", "Light touch (bi-weekly)"] },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Pipeline" },
      { href: "/chat", icon: MessageSquare, label: "Conversations" },
      { href: "/contacts", icon: Users, label: "Leads" },
      { href: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["Respond to inquiries instantly", "Qualify leads automatically", "Send quotes & follow up", "Book meetings"],
  },
  support: {
    title: "Support Dashboard",
    emoji: "🎧",
    color: "from-rose-500 to-red-500",
    accent: "rose",
    stats: [
      { label: "Open Tickets", value: "0", icon: Headphones, color: "text-rose-400" },
      { label: "Resolved Today", value: "0", icon: CheckCircle, color: "text-green-400" },
      { label: "Avg Response", value: "—", icon: Clock, color: "text-blue-400" },
      { label: "Satisfaction", value: "—", icon: Star, color: "text-yellow-400" },
    ],
    setupSteps: [
      { id: "company", label: "Company Name", placeholder: "Your company name", type: "text" },
      { id: "product_info", label: "Product/Service Description", placeholder: "What does your company do?", type: "textarea" },
      { id: "faq", label: "Common Questions & Answers", placeholder: "Q: How do I reset my password?\nA: Go to Settings > Security...", type: "textarea" },
      { id: "escalation", label: "Escalation Contact", placeholder: "Email or phone for issues the AI can't handle", type: "text" },
      { id: "hours", label: "Support Hours", placeholder: "24/7 or Mon-Fri 9am-6pm", type: "text" },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Overview" },
      { href: "/chat", icon: MessageSquare, label: "Tickets" },
      { href: "/knowledge", icon: FileText, label: "Knowledge Base" },
      { href: "/contacts", icon: Users, label: "Customers" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["24/7 automated support", "Answer FAQs instantly", "Escalate complex issues", "Track satisfaction"],
  },
};

// Fallback for custom/unknown templates
const DEFAULT_DASH: TemplateDashConfig = {
  title: "Agent Dashboard",
  emoji: "✨",
  color: "from-indigo-500 to-violet-600",
  accent: "indigo",
  stats: [
    { label: "Conversations", value: "0", icon: MessageSquare, color: "text-indigo-400" },
    { label: "Contacts", value: "0", icon: Users, color: "text-green-400" },
    { label: "Tasks Done", value: "0", icon: CheckCircle, color: "text-blue-400" },
    { label: "Active", value: "Yes", icon: Bot, color: "text-emerald-400" },
  ],
  setupSteps: [],
  nav: [
    { href: "/dashboard", icon: BarChart3, label: "Overview" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ],
  features: [],
};

type StatItem = { label: string; value: string; icon: any; color: string };
type SetupStep = { id: string; label: string; placeholder: string; type: string; options?: string[] };
type NavItem = { href: string; icon: any; label: string };
type TemplateDashConfig = {
  title: string; emoji: string; color: string; accent: string;
  stats: StatItem[]; setupSteps: SetupStep[]; nav: NavItem[]; features: string[];
};

// ─── Setup Wizard (template-specific) ────────────────────────
function SetupWizard({ agent, config, onComplete }: { agent: any; config: TemplateDashConfig; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const currentStep = config.setupSteps[step];
  const isLast = step === config.setupSteps.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      try {
        await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _update: true,
            agentId: agent.id,
            config: { ...agent.config, ...values, setupComplete: true },
          }),
        });
        toast.success("Setup complete! Your agent is ready.");
        onComplete();
      } catch {
        toast.error("Failed to save");
      }
      setSaving(false);
    } else {
      setStep(step + 1);
    }
  };

  if (!currentStep) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{config.emoji}</span>
          <span className="text-sm text-gray-500">
            Setting up your {agent.name} · Step {step + 1} of {config.setupSteps.length}
          </span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.color} transition-all`}
            style={{ width: `${((step + 1) / config.setupSteps.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <h2 className="text-2xl font-bold">{currentStep.label}</h2>

        {/* Input */}
        {currentStep.type === "text" && (
          <input
            type="text"
            value={values[currentStep.id] || ""}
            onChange={(e) => setValues({ ...values, [currentStep.id]: e.target.value })}
            placeholder={currentStep.placeholder}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white transition"
            autoFocus
          />
        )}
        {currentStep.type === "textarea" && (
          <textarea
            value={values[currentStep.id] || ""}
            onChange={(e) => setValues({ ...values, [currentStep.id]: e.target.value })}
            placeholder={currentStep.placeholder}
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white transition resize-none"
            autoFocus
          />
        )}
        {currentStep.type === "select" && (
          <div className="space-y-2">
            {currentStep.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => setValues({ ...values, [currentStep.id]: opt })}
                className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                  values[currentStep.id] === opt
                    ? "border-white bg-white/10"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {currentStep.type === "file" && (
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400">{currentStep.placeholder}</p>
            <p className="text-gray-600 text-sm mt-2">Coming soon — skip for now</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            className={`px-4 py-2 rounded-xl text-sm ${step > 0 ? "text-gray-400 hover:text-white cursor-pointer" : "invisible"}`}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className={`px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${config.color} hover:opacity-90 transition cursor-pointer flex items-center gap-2`}
          >
            {saving ? "Saving..." : isLast ? "Finish Setup" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={() => {
            if (isLast) handleNext();
            else setStep(step + 1);
          }}
          className="w-full text-center text-xs text-gray-600 hover:text-gray-400 cursor-pointer"
        >
          Skip this step
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function TemplateDashboard({ agent, needsSetup }: { agent: any; needsSetup: boolean }) {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(needsSetup);
  const [activeNav, setActiveNav] = useState("/dashboard");

  const templateSlug = agent.template || "custom";
  const dashConfig = TEMPLATE_DASHBOARDS[templateSlug] || DEFAULT_DASH;
  const tpl = TEMPLATES.find((t) => t.slug === templateSlug);

  // Show setup wizard if not complete
  if (showSetup && dashConfig.setupSteps.length > 0) {
    return (
      <SetupWizard
        agent={agent}
        config={dashConfig}
        onComplete={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col">
        {/* Back to all agents */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          All Agents
        </button>

        {/* Agent identity */}
        <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-gray-800/50">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dashConfig.color} flex items-center justify-center text-lg`}>
            {dashConfig.emoji}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{agent.name}</p>
            <p className="text-xs text-gray-500">{tpl?.tagline || "AI Agent"}</p>
          </div>
        </div>

        {/* Template-specific navigation */}
        <nav className="space-y-1 flex-1">
          {dashConfig.nav.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.href;
            return (
              <button
                key={item.href}
                onClick={() => {
                  setActiveNav(item.href);
                  if (item.href !== "/dashboard") router.push(item.href);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Add agent / upgrade */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => router.push("/create")}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-gray-800/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
          <SignOutButton redirectUrl="/">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span>{dashConfig.emoji}</span>
            {dashConfig.title}
          </h1>
          <p className="text-gray-500 mt-1">{agent.name} is ready to work</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashConfig.stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick actions + features */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Connect channels */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Connect Channels</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/whatsapp")}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                  <div className="text-left">
                    <p className="font-medium text-sm">WhatsApp</p>
                    <p className="text-xs text-gray-500">
                      {agent.whatsappStatus === "connected" ? "Connected ✓" : "Connect your number"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => router.push("/number")}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Phone Number</p>
                    <p className="text-xs text-gray-500">
                      {agent.phoneNumber || "Get a phone number"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* What your agent can do */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">What {agent.name} Does</h3>
            <div className="space-y-3">
              {dashConfig.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/chat")}
              className={`mt-6 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${dashConfig.color} hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat with {agent.name}
            </button>
          </div>
        </div>

        {/* Daily Digest */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Today&apos;s Digest</h3>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="text-center py-8 text-gray-600">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No activity yet today.</p>
            <p className="text-xs text-gray-700 mt-1">Connect a channel and {agent.name} will summarize their work here.</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4">Recent Conversations</h3>
          <div className="text-center py-8 text-gray-600">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No conversations yet. Connect a channel to get started!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
