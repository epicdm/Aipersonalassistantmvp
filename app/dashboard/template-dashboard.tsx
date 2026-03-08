"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Phone, MessageSquare, Users, Settings, Calendar, DollarSign,
  FileText, MapPin, Star, Clock, TrendingUp, Bell, LogOut,
  Sparkles, Bot, ChevronRight, Send, Plus, BarChart3,
  Headphones, Target, Wallet, ArrowRight, CheckCircle, ArrowLeft,
  X, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/app/lib/templates";
import { SignOutButton } from "@clerk/nextjs";

// ─── Types ───────────────────────────────────────────────────
type StatItem = { label: string; value: string; icon: any; color: string };
type SetupStep = { id: string; label: string; placeholder: string; type: string; options?: string[] };
type NavItem = { href: string; icon: any; label: string };
type TemplateDashConfig = {
  title: string; emoji: string; color: string; accent: string;
  stats: StatItem[]; setupSteps: SetupStep[]; nav: NavItem[]; features: string[];
};

// ─── Template Configs ────────────────────────────────────────
const TEMPLATE_DASHBOARDS: Record<string, TemplateDashConfig> = {
  assistant: {
    title: "Personal Assistant",
    emoji: "✨",
    color: "from-indigo-500 to-violet-500",
    accent: "indigo",
    stats: [
      { label: "Reminders Today", value: "0", icon: Bell, color: "text-indigo-400" },
      { label: "Bills Due", value: "0", icon: DollarSign, color: "text-amber-400" },
      { label: "To-Dos", value: "0", icon: CheckCircle, color: "text-green-400" },
      { label: "Status", value: "🟢 Online", icon: Bot, color: "text-emerald-400" },
    ],
    setupSteps: [
      { id: "personality", label: "Personality Style", placeholder: "", type: "select", options: ["Casual", "Professional", "Funny"] },
      { id: "quiet_hours", label: "Quiet Hours", placeholder: "e.g. 10pm-7am", type: "text" },
      { id: "digest_time", label: "Daily Digest Time", placeholder: "e.g. 7:00 AM", type: "text" },
    ],
    nav: [
      { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
      { href: "/chat", icon: MessageSquare, label: "Chat" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    features: ["Track bills & due dates", "Set reminders", "Manage to-do lists", "Send messages for you"],
  },
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
      { id: "attractions", label: "Top Attractions Nearby", placeholder: "Waterfalls, beaches, restaurants...", type: "textarea" },
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

// ─── Setup Wizard ─────────────────────────────────────────────
function SetupWizard({ agent, config, onComplete }: { agent: any; config: TemplateDashConfig; onComplete: () => void }) {
  const businessInfo = agent.config?.business;

  const buildInitialValues = () => {
    const vals: Record<string, string> = {};
    if (businessInfo) {
      config.setupSteps.forEach((s) => {
        if (s.id === "business" || s.id === "company" || s.id === "property")
          vals[s.id] = businessInfo.name || "";
        else if (s.id === "location") vals[s.id] = businessInfo.location || "";
        else if (s.id === "services" && businessInfo.services)
          vals[s.id] = businessInfo.services.join("\n");
      });
    }
    return vals;
  };

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(buildInitialValues);
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
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{config.emoji}</span>
          <span className="text-sm text-gray-500">
            Setting up {agent.name} · Step {step + 1} of {config.setupSteps.length}
          </span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.color} transition-all`}
            style={{ width: `${((step + 1) / config.setupSteps.length) * 100}%` }}
          />
        </div>
        <h2 className="text-2xl font-bold">{currentStep.label}</h2>
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
        <button
          onClick={() => { if (isLast) handleNext(); else setStep(step + 1); }}
          className="w-full text-center text-xs text-gray-600 hover:text-gray-400 cursor-pointer"
        >
          Skip this step
        </button>
      </motion.div>
    </div>
  );
}

// ─── Sidebar (shared) ─────────────────────────────────────────
function Sidebar({ agent, dashConfig, tpl }: { agent: any; dashConfig: TemplateDashConfig; tpl: any }) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("/dashboard");

  return (
    <div className="w-64 shrink-0 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        All Agents
      </button>
      <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-gray-800/50">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dashConfig.color} flex items-center justify-center text-lg`}>
          {dashConfig.emoji}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{agent.name}</p>
          <p className="text-xs text-gray-500">{tpl?.tagline || "AI Agent"}</p>
        </div>
      </div>
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
                isActive ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
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
  );
}

// ─── Modal helper ─────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Personal Assistant Dashboard ────────────────────────────
function PersonalAssistantDashboard({ agent }: { agent: any }) {
  const router = useRouter();
  const dashConfig = TEMPLATE_DASHBOARDS.assistant;
  const tpl = TEMPLATES.find((t) => t.slug === "assistant");

  const [reminders, setReminders] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // form states
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDue, setBillDue] = useState("");
  const [todoText, setTodoText] = useState("");
  const [newTodoText, setNewTodoText] = useState("");

  useEffect(() => {
    fetchAll();
  }, [agent.id]);

  async function fetchAll() {
    try {
      const [rRes, bRes, tRes] = await Promise.all([
        fetch(`/api/reminders?agentId=${agent.id}`),
        fetch(`/api/bills?agentId=${agent.id}`),
        fetch(`/api/todos?agentId=${agent.id}`),
      ]);
      const [rData, bData, tData] = await Promise.all([rRes.json(), bRes.json(), tRes.json()]);
      setReminders(rData.reminders || []);
      setBills(bData.bills || []);
      setTodos(tData.todos || []);
    } catch {
      // silently fail — empty state is fine
    }
  }

  async function createReminder() {
    if (!reminderText || !reminderDate) return;
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, text: reminderText, datetime: reminderDate }),
    });
    setReminderText(""); setReminderDate("");
    setShowReminderModal(false);
    fetchAll();
    toast.success("Reminder added!");
  }

  async function createBill() {
    if (!billName || !billAmount || !billDue) return;
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, name: billName, amount: parseFloat(billAmount), dueDate: billDue }),
    });
    setBillName(""); setBillAmount(""); setBillDue("");
    setShowBillModal(false);
    fetchAll();
    toast.success("Bill added!");
  }

  async function createTodo(text: string) {
    if (!text.trim()) return;
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, text }),
    });
    setNewTodoText("");
    fetchAll();
  }

  async function toggleTodo(id: string, done: boolean) {
    await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done }),
    });
    fetchAll();
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function toggleBill(id: string, paid: boolean) {
    await fetch("/api/bills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paid }),
    });
    fetchAll();
  }

  async function deleteBill(id: string) {
    await fetch(`/api/bills?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function deleteReminder(id: string) {
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  function billColor(bill: any) {
    if (bill.paid) return "text-green-400";
    const days = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "text-red-400";
    if (days <= 3) return "text-amber-400";
    return "text-gray-300";
  }

  function billBg(bill: any) {
    if (bill.paid) return "border-green-500/20 bg-green-500/5";
    const days = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "border-red-500/20 bg-red-500/5";
    if (days <= 3) return "border-amber-500/20 bg-amber-500/5";
    return "border-gray-700 bg-gray-800/30";
  }

  function fmtTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function fmtDate(d: string) { return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" }); }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar agent={agent} dashConfig={dashConfig} tpl={tpl} />

      <div className="flex-1 overflow-auto">
        {/* Top header bar */}
        <div className="border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
              ✨
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm text-gray-400">🟢 Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition cursor-pointer"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => router.push(`/chat?agentId=${agent.id}`)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat with {agent.name}
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm transition cursor-pointer"
            >
              <Bell className="w-4 h-4 text-indigo-400" />
              ➕ Add Reminder
            </button>
            <button
              onClick={() => setShowBillModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-amber-400" />
              💸 Track a Bill
            </button>
            <button
              onClick={() => setShowTodoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-green-400" />
              📝 Add To-Do
            </button>
          </div>

          {/* 4-card grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 📋 Today — Reminders */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  📋 Today
                </h2>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-full">
                  {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              {reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-500">No reminders today</p>
                  <p className="text-xs text-gray-600 mt-1">Tell your AI what to remember</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-800/60 rounded-xl group">
                      <div>
                        <p className="text-sm font-medium">{r.text}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtTime(r.datetime)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.sent
                          ? <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Sent ✓</span>
                          : <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Pending</span>
                        }
                        <button
                          onClick={() => deleteReminder(r.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 💸 Bills */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  💸 Bills
                </h2>
                <span className="text-xs text-gray-600">
                  {bills.filter(b => !b.paid).length} unpaid
                </span>
              </div>
              {bills.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-500">No bills tracked yet</p>
                  <p className="text-xs text-gray-600 mt-1">Try: &ldquo;I owe FLOW $200 due March 20&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bills.map((b) => (
                    <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border group ${billBg(b)}`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleBill(b.id, !b.paid)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                            b.paid ? "bg-green-500 border-green-500" : "border-gray-500 hover:border-green-400"
                          }`}
                        >
                          {b.paid && <CheckCircle className="w-3 h-3 text-white" />}
                        </button>
                        <div>
                          <p className={`text-sm font-medium ${b.paid ? "line-through text-gray-500" : ""}`}>{b.name}</p>
                          <p className={`text-xs mt-0.5 ${billColor(b)}`}>
                            ${b.amount.toFixed(2)} · due {fmtDate(b.dueDate)}
                            {!b.paid && (() => {
                              const days = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / 86400000);
                              if (days < 0) return " · OVERDUE";
                              if (days === 0) return " · due today";
                              if (days <= 3) return ` · ${days}d left`;
                              return "";
                            })()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteBill(b.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 💬 Recent Activity */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  💬 Recent Activity
                </h2>
              </div>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-500">No activity yet</p>
                  <p className="text-xs text-gray-600 mt-1">Connect WhatsApp and {agent.name} will log actions here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-xl">
                      <Bot className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm">{a.summary}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 📝 To-Do */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  📝 To-Do
                </h2>
                <span className="text-xs text-gray-600">
                  {todos.filter(t => !t.done).length} remaining
                </span>
              </div>

              {/* Inline add */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { createTodo(newTodoText); } }}
                  placeholder="Add a task..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  onClick={() => createTodo(newTodoText)}
                  disabled={!newTodoText.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {todos.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-500">Your to-do list is empty</p>
                  <p className="text-xs text-gray-600 mt-1">Try: &ldquo;Add buy groceries to my list&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todos.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/40 group transition">
                      <button
                        onClick={() => toggleTodo(t.id, !t.done)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                          t.done ? "bg-green-500 border-green-500" : "border-gray-500 hover:border-green-400"
                        }`}
                      >
                        {t.done && <CheckCircle className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${t.done ? "line-through text-gray-500" : ""}`}>{t.text}</span>
                      <button
                        onClick={() => deleteTodo(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings section */}
          {showSettings && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-lg">⚙️ Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Personality</label>
                  <div className="flex gap-2">
                    {["Casual", "Professional", "Funny"].map((p) => (
                      <button
                        key={p}
                        className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 hover:border-indigo-500 transition cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Daily Digest Time</label>
                  <input
                    type="time"
                    defaultValue="07:00"
                    className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Quiet Hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                    <span className="text-gray-600 text-sm">to</span>
                    <input
                      type="time"
                      defaultValue="07:00"
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Connected Channels</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-800/60 rounded-xl">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    <span className="text-sm">WhatsApp</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      agent.whatsappStatus === "connected"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-gray-700 text-gray-500"
                    }`}>
                      {agent.whatsappStatus === "connected" ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <Modal title="➕ Add Reminder" onClose={() => setShowReminderModal(false)}>
          <div className="space-y-4">
            <input
              type="text"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="What should I remind you about?"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={createReminder}
              disabled={!reminderText || !reminderDate}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              Add Reminder
            </button>
          </div>
        </Modal>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <Modal title="💸 Track a Bill" onClose={() => setShowBillModal(false)}>
          <div className="space-y-4">
            <input
              type="text"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="Bill name (e.g. FLOW, Netflix)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
            <div className="flex gap-3">
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="Amount ($)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              />
              <input
                type="date"
                value={billDue}
                onChange={(e) => setBillDue(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              onClick={createBill}
              disabled={!billName || !billAmount || !billDue}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              Track Bill
            </button>
          </div>
        </Modal>
      )}

      {/* Todo Modal */}
      {showTodoModal && (
        <Modal title="📝 Add To-Do" onClose={() => setShowTodoModal(false)}>
          <div className="space-y-4">
            <input
              type="text"
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { createTodo(todoText); setShowTodoModal(false); } }}
              placeholder="What do you need to do?"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
            <button
              onClick={() => { createTodo(todoText); setShowTodoModal(false); }}
              disabled={!todoText.trim()}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              Add To-Do
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Generic Dashboard (all other templates) ─────────────────
function GenericDashboard({ agent, dashConfig }: { agent: any; dashConfig: TemplateDashConfig }) {
  const router = useRouter();
  const tpl = TEMPLATES.find((t) => t.slug === agent.template);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // Future: fetch agent activities
  }, [agent.id]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar agent={agent} dashConfig={dashConfig} tpl={tpl} />

      <div className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>{dashConfig.emoji}</span>
              {agent.name}
            </h1>
            <p className="text-gray-500 mt-1">{tpl?.tagline || dashConfig.title} · <span className="text-emerald-400">🟢 Online</span></p>
          </div>
          <button
            onClick={() => router.push(`/chat?agentId=${agent.id}`)}
            className={`px-5 py-3 bg-gradient-to-r ${dashConfig.color} text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-2`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat with {agent.name}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashConfig.stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Connect Channels */}
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
                    <p className="text-xs text-gray-500">{agent.phoneNumber || "Get a phone number"}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Features */}
          {dashConfig.features.length > 0 ? (
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
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <Sparkles className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="font-bold text-lg mb-1">Template Features</h3>
              <p className="text-gray-500 text-sm">Coming soon — connect a channel to get started</p>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity yet.</p>
              <p className="text-xs text-gray-700 mt-1">Connect a channel and {agent.name} will log actions here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <Bot className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">{a.summary}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────
export default function TemplateDashboard({ agent, needsSetup }: { agent: any; needsSetup: boolean }) {
  const templateSlug = agent.template || "custom";
  const dashConfig = TEMPLATE_DASHBOARDS[templateSlug] || DEFAULT_DASH;

  const [showSetup, setShowSetup] = useState(needsSetup);

  // Skip setup if we already have business data from the scan
  const hasBusinessInfo = !!(agent.config?.business);
  const shouldShowSetup = showSetup && dashConfig.setupSteps.length > 0 && !hasBusinessInfo;

  if (shouldShowSetup) {
    return (
      <SetupWizard
        agent={agent}
        config={dashConfig}
        onComplete={() => setShowSetup(false)}
      />
    );
  }

  // Personal Assistant gets its own rich dashboard
  if (templateSlug === "assistant") {
    return <PersonalAssistantDashboard agent={agent} />;
  }

  // All other templates use the generic dashboard
  return <GenericDashboard agent={agent} dashConfig={dashConfig} />;
}
