"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Settings, Bell, CheckCircle, Bot,
  Phone, Plus, Trash2, ExternalLink, Wifi, WifiOff, Calendar,
  Instagram, ChevronRight, BarChart3, CreditCard, ClipboardList,
  Menu, X, LogOut, Save, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { SignOutButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ─── Types ────────────────────────────────────────────────────
type Tab = "overview" | "conversations" | "reminders" | "bills" | "todos" | "settings";

type WhatsAppMessage = {
  id: string;
  phone: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type Reminder = { id: string; text: string; datetime: string; sent: boolean };
type Bill = { id: string; name: string; amount: number; dueDate: string; paid: boolean };
type Todo = { id: string; text: string; done: boolean };
type Connections = {
  google?: { signedIn: boolean; calendar: boolean };
  instagram?: { connected: boolean; username?: string } | null;
  whatsapp?: { connected: boolean; phone?: string };
};

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtDateFull(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function billStatus(bill: Bill) {
  if (bill.paid) return { label: "Paid", color: "text-green-400", bg: "border-green-500/20 bg-green-500/5" };
  const days = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Overdue", color: "text-red-400", bg: "border-red-500/20 bg-red-500/5" };
  if (days <= 3) return { label: `${days}d left`, color: "text-yellow-400", bg: "border-yellow-500/20 bg-yellow-500/5" };
  return { label: fmtDate(bill.dueDate), color: "text-gray-400", bg: "border-gray-700 bg-gray-800/30" };
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({
  agent,
  activeTab,
  onTabChange,
  connections,
  sidebarOpen,
  onClose,
}: {
  agent: any;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  connections: Connections;
  sidebarOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const whatsappConnected = agent.whatsappStatus === "connected";
  const whatsappPhone = agent.whatsappPhone || agent.phone || null;

  const navItems: { tab: Tab; icon: any; label: string }[] = [
    { tab: "overview", icon: BarChart3, label: "Overview" },
    { tab: "conversations", icon: MessageSquare, label: "Conversations" },
    { tab: "reminders", icon: Bell, label: "Reminders" },
    { tab: "bills", icon: CreditCard, label: "Bills" },
    { tab: "todos", icon: ClipboardList, label: "Todos" },
    { tab: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static top-0 left-0 h-full z-40 w-64 bg-gray-900 border-r border-gray-800
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* BFF Logo */}
        <div className="p-4 pb-0 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-lg font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tracking-tight cursor-pointer"
          >
            BFF AI
          </button>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-white cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent identity */}
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-bold">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{agent.name}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Online
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-800" />

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => { onTabChange(tab); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${
                activeTab === tab
                  ? "bg-indigo-600/20 text-indigo-300 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <Separator className="bg-gray-800" />

        {/* WhatsApp status */}
        <div className="p-3">
          <button
            onClick={() => router.push("/whatsapp")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition cursor-pointer text-left"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${whatsappConnected ? "bg-green-500/20" : "bg-gray-700"}`}>
              {whatsappConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-300">WhatsApp</p>
              <p className="text-xs text-gray-500 truncate">
                {whatsappConnected ? (whatsappPhone || "Connected") : "Not connected"}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          </button>
        </div>

        {/* Sign out */}
        <div className="p-3 pt-0">
          <SignOutButton redirectUrl="/">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab({
  agent,
  reminders,
  bills,
  todos,
  messages,
  connections,
  onTabChange,
}: {
  agent: any;
  reminders: Reminder[];
  bills: Bill[];
  todos: Todo[];
  messages: WhatsAppMessage[];
  connections: Connections;
  onTabChange: (t: Tab) => void;
}) {
  const whatsappConnected = agent.whatsappStatus === "connected";
  const waPhone = agent.whatsappPhone || agent.phone;
  const waLink = waPhone ? `https://wa.me/${waPhone.replace(/\D/g, "")}` : null;

  // Stats
  const todayStr = new Date().toDateString();
  const msgsToday = messages.filter(
    (m) => new Date(m.timestamp).toDateString() === todayStr
  ).length;
  const activeReminders = reminders.filter((r) => !r.sent).length;
  const upcomingBills = bills.filter((b) => {
    if (b.paid) return false;
    const days = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;
  const pendingTodos = todos.filter((t) => !t.done).length;

  const stats = [
    { label: "Messages Today", value: msgsToday, icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Active Reminders", value: activeReminders, icon: Bell, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Upcoming Bills", value: upcomingBills, icon: CreditCard, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Pending Todos", value: pendingTodos, icon: ClipboardList, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <Card className="bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                <p className="text-sm text-indigo-300 mt-0.5">
                  {agent.template ? `${agent.template.charAt(0).toUpperCase()}${agent.template.slice(1)} Assistant` : "Personal Assistant"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {whatsappConnected
                    ? "Your agent is active on WhatsApp. Talk to it anytime."
                    : "Connect WhatsApp to activate your agent."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {whatsappConnected && waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  Open WhatsApp
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                  onClick={() => window.location.href = "/whatsapp"}
                >
                  Connect WhatsApp
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Connected Services */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-300">Connected Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* WhatsApp */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${whatsappConnected ? "bg-green-500/20" : "bg-gray-700"}`}>
                  <Phone className={`w-4 h-4 ${whatsappConnected ? "text-green-400" : "text-gray-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">WhatsApp</p>
                  <p className="text-xs text-gray-500">{waPhone || "Not connected"}</p>
                </div>
              </div>
              <Badge
                className={whatsappConnected
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-gray-700 text-gray-500 border-gray-600"}
              >
                {whatsappConnected ? "Connected" : "Offline"}
              </Badge>
            </div>

            {/* Google Calendar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${connections.google?.calendar ? "bg-blue-500/20" : "bg-gray-700"}`}>
                  <Calendar className={`w-4 h-4 ${connections.google?.calendar ? "text-blue-400" : "text-gray-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Google Calendar</p>
                  <p className="text-xs text-gray-500">{connections.google?.signedIn ? "Google account connected" : "Not connected"}</p>
                </div>
              </div>
              <Badge
                className={connections.google?.calendar
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-gray-700 text-gray-500 border-gray-600"}
              >
                {connections.google?.calendar ? "Active" : "Offline"}
              </Badge>
            </div>

            {/* Instagram */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${connections.instagram?.connected ? "bg-pink-500/20" : "bg-gray-700"}`}>
                  <Instagram className={`w-4 h-4 ${connections.instagram?.connected ? "text-pink-400" : "text-gray-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Instagram</p>
                  <p className="text-xs text-gray-500">
                    {connections.instagram?.connected ? `@${connections.instagram.username}` : "Not connected"}
                  </p>
                </div>
              </div>
              <Badge
                className={connections.instagram?.connected
                  ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                  : "bg-gray-700 text-gray-500 border-gray-600"}
              >
                {connections.instagram?.connected ? "Active" : "Offline"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-300">Recent Activity</CardTitle>
            {messages.length > 0 && (
              <button
                onClick={() => onTabChange("conversations")}
                className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                View all →
              </button>
            )}
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-600 mt-1">Connect WhatsApp to see activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.slice(-5).reverse().map((m) => (
                  <div key={m.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-800/40">
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                      m.role === "user" ? "bg-indigo-500/20 text-indigo-400" : "bg-violet-500/20 text-violet-400"
                    }`}>
                      {m.role === "user" ? "U" : "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{m.content}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{fmtTime(m.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Conversations Tab ────────────────────────────────────────
function ConversationsTab({ messages }: { messages: WhatsAppMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-300">
          WhatsApp Conversations
          <span className="ml-2 text-xs font-normal text-gray-500">({messages.length} messages)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-600 mt-1">Connect WhatsApp and start chatting</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0 mt-1">
                    A
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-xs mt-1 ${m.role === "user" ? "text-indigo-200" : "text-gray-500"}`}>
                    {fmtTime(m.timestamp)}
                  </p>
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0 mt-1">
                    U
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────
function RemindersTab({ agentId }: { agentId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState("");
  const [datetime, setDatetime] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function fetchReminders() {
    const res = await fetch(`/api/reminders?agentId=${agentId}`);
    const data = await res.json();
    setReminders(data.reminders || []);
  }

  useEffect(() => { fetchReminders(); }, [agentId]);

  async function addReminder() {
    if (!text || !datetime) return;
    setLoading(true);
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, text, datetime }),
    });
    setText(""); setDatetime(""); setShowForm(false);
    await fetchReminders();
    toast.success("Reminder added!");
    setLoading(false);
  }

  async function deleteReminder(id: string) {
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
    fetchReminders();
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-300">Reminders</CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer h-8 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Reminder
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Inline form */}
        {showForm && (
          <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should I remind you about?"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white placeholder-gray-500"
              autoFocus
            />
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={addReminder}
                disabled={!text || !datetime || loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                {loading ? "Saving..." : "Save Reminder"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {reminders.length === 0 && !showForm ? (
          <div className="text-center py-10">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No reminders yet</p>
            <p className="text-xs text-gray-600 mt-1">Tell your agent: "Remind me to pay rent on the 1st"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800/80 group transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${r.sent ? "bg-green-500/20" : "bg-indigo-500/20"}`}>
                    <Bell className={`w-4 h-4 ${r.sent ? "text-green-400" : "text-indigo-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{r.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fmtDateFull(r.datetime)} at {fmtTime(r.datetime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={r.sent ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}>
                    {r.sent ? "Sent ✓" : "Pending"}
                  </Badge>
                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );}

// ─── Bills Tab ────────────────────────────────────────────────
function BillsTab({ agentId }: { agentId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function fetchBills() {
    const res = await fetch(`/api/bills?agentId=${agentId}`);
    const data = await res.json();
    setBills(data.bills || []);
  }

  useEffect(() => { fetchBills(); }, [agentId]);

  async function addBill() {
    if (!name || !amount || !dueDate) return;
    setLoading(true);
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, name, amount: parseFloat(amount), dueDate }),
    });
    setName(""); setAmount(""); setDueDate(""); setShowForm(false);
    await fetchBills();
    toast.success("Bill added!");
    setLoading(false);
  }

  async function toggleBill(id: string, paid: boolean) {
    await fetch("/api/bills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paid }),
    });
    fetchBills();
  }

  async function deleteBill(id: string) {
    await fetch(`/api/bills?id=${id}`, { method: "DELETE" });
    fetchBills();
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-300">Bills</CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer h-8 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Bill
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bill name (e.g. FLOW, Netflix)"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition text-white placeholder-gray-500"
              autoFocus
            />
            <div className="flex gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount ($)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition text-white placeholder-gray-500"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addBill} disabled={!name || !amount || !dueDate || loading}
                className="bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer">
                {loading ? "Saving..." : "Save Bill"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white cursor-pointer">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {bills.length === 0 && !showForm ? (
          <div className="text-center py-10">
            <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No bills tracked yet</p>
            <p className="text-xs text-gray-600 mt-1">Try: "I owe FLOW $200 due the 20th"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bills.map((b) => {
              const status = billStatus(b);
              return (
                <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border group transition ${status.bg}`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBill(b.id, !b.paid)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                        b.paid ? "bg-green-500 border-green-500" : "border-gray-500 hover:border-green-400"
                      }`}
                    >
                      {b.paid && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${b.paid ? "line-through text-gray-500" : "text-gray-200"}`}>{b.name}</p>
                      <p className={`text-xs mt-0.5 ${status.color}`}>${b.amount.toFixed(2)} · {status.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={b.paid ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      status.color.includes("red") ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      status.color.includes("yellow") ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      "bg-gray-700 text-gray-400 border-gray-600"}>
                      {b.paid ? "Paid" : status.label}
                    </Badge>
                    <button onClick={() => deleteBill(b.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Todos Tab ────────────────────────────────────────────────
function TodosTab({ agentId }: { agentId: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState("");

  async function fetchTodos() {
    const res = await fetch(`/api/todos?agentId=${agentId}`);
    const data = await res.json();
    setTodos(data.todos || []);
  }

  useEffect(() => { fetchTodos(); }, [agentId]);

  async function addTodo() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setNewText("");
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, text: trimmed }),
    });
    fetchTodos();
  }

  async function toggleTodo(id: string, done: boolean) {
    await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done }),
    });
    fetchTodos();
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
    fetchTodos();
  }

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          Todos
          {pending.length > 0 && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">{pending.length} remaining</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
            placeholder="Add a task... (press Enter)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 transition text-white placeholder-gray-500"
          />
          <Button size="sm" onClick={addTodo} disabled={!newText.trim()}
            className="bg-green-600 hover:bg-green-500 text-white cursor-pointer px-3">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {todos.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No todos yet</p>
            <p className="text-xs text-gray-600 mt-1">Type above or tell your agent: "Add buy milk to my list"</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pending.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/40 group transition">
                <button onClick={() => toggleTodo(t.id, true)}
                  className="w-5 h-5 rounded border-2 border-gray-500 hover:border-green-400 flex items-center justify-center shrink-0 transition cursor-pointer" />
                <span className="flex-1 text-sm text-gray-200">{t.text}</span>
                <button onClick={() => deleteTodo(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {done.length > 0 && (
              <>
                {pending.length > 0 && <Separator className="bg-gray-800 my-2" />}
                {done.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/40 group transition opacity-50">
                    <button onClick={() => toggleTodo(t.id, false)}
                      className="w-5 h-5 rounded bg-green-500 border-2 border-green-500 flex items-center justify-center shrink-0 cursor-pointer">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </button>
                    <span className="flex-1 text-sm text-gray-500 line-through">{t.text}</span>
                    <button onClick={() => deleteTodo(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ agent }: { agent: any }) {
  const [agentName, setAgentName] = useState(agent.name || "");
  const [personality, setPersonality] = useState(agent.config?.personality || "Casual");
  const [quietHours, setQuietHours] = useState(agent.config?.quiet_hours || "");
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _update: true,
          agentId: agent.id,
          name: agentName,
          config: { ...agent.config, personality, quiet_hours: quietHours },
        }),
      });
      if (res.ok) { toast.success("Settings saved!"); }
      else { toast.error("Failed to save settings"); }
    } catch { toast.error("Network error"); }
    setSaving(false);
  }

  async function resetAgent() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    try {
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _update: true, agentId: agent.id, config: {} }),
      });
      toast.success("Agent reset. Refresh the page.");
      setResetConfirm(false);
    } catch { toast.error("Failed to reset agent"); }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-300">Agent Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">Agent Name</label>
            <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">Personality / Tone</label>
            <div className="flex flex-wrap gap-2">
              {["Casual", "Professional", "Funny", "Empathetic", "Direct"].map((p) => (
                <button key={p} onClick={() => setPersonality(p)}
                  className={`px-4 py-2 rounded-xl text-sm border transition cursor-pointer ${
                    personality === p
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">Quiet Hours</label>
            <input type="text" value={quietHours} onChange={(e) => setQuietHours(e.target.value)}
              placeholder="e.g. 10pm–7am"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white placeholder-gray-500" />
            <p className="text-xs text-gray-600 mt-1">Your agent won't send reminders during these hours</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-red-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">
            Reset will clear all agent configuration. Your reminders, bills, and todos are kept.
          </p>
          <Button onClick={resetAgent} variant="outline"
            className={`border-red-700 cursor-pointer transition ${
              resetConfirm
                ? "bg-red-600 hover:bg-red-500 text-white border-red-500"
                : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
            }`}>
            {resetConfirm ? "⚠️ Click again to confirm reset" : "Reset Agent"}
          </Button>
          {resetConfirm && (
            <button onClick={() => setResetConfirm(false)}
              className="ml-3 text-xs text-gray-500 hover:text-gray-300 cursor-pointer">
              Cancel
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard Shell ─────────────────────────────────────
function DashboardShell({ agent }: { agent: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [connections, setConnections] = useState<Connections>({});

  useEffect(() => {
    async function loadAll() {
      try {
        const [rRes, bRes, tRes, mRes, cRes] = await Promise.all([
          fetch(`/api/reminders?agentId=${agent.id}`),
          fetch(`/api/bills?agentId=${agent.id}`),
          fetch(`/api/todos?agentId=${agent.id}`),
          fetch(`/api/whatsapp/history?agentId=${agent.id}`),
          fetch("/api/connections"),
        ]);
        const [rData, bData, tData, mData, cData] = await Promise.all([
          rRes.json(), bRes.json(), tRes.json(), mRes.json(), cRes.json(),
        ]);
        setReminders(rData.reminders || []);
        setBills(bData.bills || []);
        setTodos(tData.todos || []);
        setMessages(mData.messages || []);
        setConnections(cData || {});
      } catch { /* silent */ }
    }
    loadAll();
  }, [agent.id]);

  const tabLabels: Record<Tab, string> = {
    overview: "Overview",
    conversations: "Conversations",
    reminders: "Reminders",
    bills: "Bills",
    todos: "Todos",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar
        agent={agent}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connections={connections}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-200">{tabLabels[activeTab]}</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "overview" && (
            <OverviewTab agent={agent} reminders={reminders} bills={bills} todos={todos}
              messages={messages} connections={connections} onTabChange={setActiveTab} />
          )}
          {activeTab === "conversations" && <ConversationsTab messages={messages} />}
          {activeTab === "reminders" && <RemindersTab agentId={agent.id} />}
          {activeTab === "bills" && <BillsTab agentId={agent.id} />}
          {activeTab === "todos" && <TodosTab agentId={agent.id} />}
          {activeTab === "settings" && <SettingsTab agent={agent} />}
        </main>
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────
export default function TemplateDashboard({ agent, needsSetup: _needsSetup }: { agent: any; needsSetup: boolean }) {
  return <DashboardShell agent={agent} />;
}
