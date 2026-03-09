"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Settings, Bell, CheckSquare, Bot,
  Phone, Plus, Trash2, ExternalLink, Wifi, WifiOff, Calendar,
  Instagram, Menu, Save, AlertTriangle, CreditCard,
  TrendingUp, Activity, ChevronRight, Check, X, MoreVertical,
  DollarSign, Clock, Star, Zap, Sun, Moon,
} from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

function isOverdue(d: string) { return new Date(d) < new Date(); }
function isDueSoon(d: string) {
  const due = new Date(d);
  const now = new Date();
  return due > now && due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
}
function isDueWithin24h(d: string) {
  const due = new Date(d);
  const now = new Date();
  return due > now && due.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
}

// Mock chart data
function getMockChartData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, messages: Math.floor(Math.random() * 40) + 5 }));
}

// ─── Theme Toggle ───────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

// ─── Sidebar Nav ───────────────────────────────────────────────
const NAV_ITEMS: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
  { tab: "conversations", label: "Conversations", icon: <MessageSquare className="w-4 h-4" /> },
  { tab: "reminders", label: "Reminders", icon: <Bell className="w-4 h-4" /> },
  { tab: "bills", label: "Bills", icon: <DollarSign className="w-4 h-4" /> },
  { tab: "todos", label: "To-Dos", icon: <CheckSquare className="w-4 h-4" /> },
  { tab: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

function SidebarContent({
  agent, activeTab, onTabChange, connections, onClose,
}: {
  agent: any; activeTab: Tab; onTabChange: (t: Tab) => void; connections: Connections; onClose?: () => void;
}) {
  const waConnected = connections?.whatsapp?.connected;
  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-gray-900 border-r border-gray-800">
      {/* Agent Identity */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
              {getInitials(agent.name || "BFF")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">{agent.name || "My Agent"}</p>
            <Badge variant="secondary" className="text-[10px] bg-indigo-900/50 text-indigo-300 border-indigo-700 mt-0.5">
              {agent.template || "personal"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${waConnected ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
          <span className={`text-xs font-medium ${waConnected ? "text-green-400" : "text-red-400"}`}>
            {waConnected ? "Active" : "Setup needed"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => { onTabChange(tab); onClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* WhatsApp Status */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          waConnected ? "bg-green-900/30 text-green-400 border border-green-800/50" : "bg-gray-800 text-gray-500"
        }`}>
          <Phone className="w-3.5 h-3.5" />
          {waConnected
            ? <span>WhatsApp connected {connections.whatsapp?.phone ? `· ${connections.whatsapp.phone}` : ""}</span>
            : <span>WhatsApp not connected</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ────────────────────────────────────────────────────
function Topbar({ agent, activeTab, onMenuClick }: { agent: any; activeTab: Tab; onMenuClick: () => void }) {
  const tabLabels: Record<Tab, string> = {
    overview: "Overview", conversations: "Conversations", reminders: "Reminders",
    bills: "Bills", todos: "To-Dos", settings: "Settings",
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 text-white font-bold">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold hidden sm:block">BFF</span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-1">
        <span className="hidden sm:block">Dashboard</span>
        <ChevronRight className="w-3.5 h-3.5 hidden sm:block" />
        <span className="text-gray-300 font-medium">{agent.name || "Agent"}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
        <span className="text-gray-400">{tabLabels[activeTab]}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800 dark:bg-gray-900 dark:border-gray-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  agent, reminders, bills, todos, messages, connections, onTabChange,
}: {
  agent: any; reminders: Reminder[]; bills: Bill[]; todos: Todo[];
  messages: WhatsAppMessage[]; connections: Connections; onTabChange: (t: Tab) => void;
}) {
  const chartData = getMockChartData();
  const todayMsgs = messages.filter(m => {
    const d = new Date(m.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const activeReminders = reminders.filter(r => !r.sent).length;
  const billsDueSoon = bills.filter(b => !b.paid && isDueSoon(b.dueDate)).length;
  const pendingTodos = todos.filter(t => !t.done).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<MessageSquare className="w-4 h-4 text-indigo-400" />} label="Messages Today" value={todayMsgs} color="bg-indigo-900/40" />
        <StatCard icon={<Bell className="w-4 h-4 text-yellow-400" />} label="Active Reminders" value={activeReminders} color="bg-yellow-900/40" />
        <StatCard icon={<DollarSign className="w-4 h-4 text-red-400" />} label="Bills Due Soon" value={billsDueSoon} color="bg-red-900/40" />
        <StatCard icon={<CheckSquare className="w-4 h-4 text-green-400" />} label="Pending To-Dos" value={pendingTodos} color="bg-green-900/40" />
      </div>

      {/* Middle grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Connected Services */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white">Connected Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "WhatsApp",
                icon: <Phone className="w-4 h-4 text-green-400" />,
                connected: connections?.whatsapp?.connected,
                detail: connections?.whatsapp?.phone,
                href: "/whatsapp",
              },
              {
                label: "Google Calendar",
                icon: <Calendar className="w-4 h-4 text-blue-400" />,
                connected: connections?.google?.calendar,
                detail: connections?.google?.signedIn ? "Signed in" : undefined,
                href: "/integrations",
              },
              {
                label: "Instagram",
                icon: <Instagram className="w-4 h-4 text-pink-400" />,
                connected: connections?.instagram?.connected,
                detail: connections?.instagram?.username ? `@${connections.instagram.username}` : undefined,
                href: "/integrations",
              },
            ].map(({ label, icon, connected, detail, href }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${connected ? "bg-gray-800" : "bg-gray-800/50"}`}>{icon}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{label}</p>
                    {detail && <p className="text-xs text-gray-500">{detail}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800/50">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <a href={href} className="text-xs text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline">
                      Connect →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white">Recent Conversations</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300 h-7 px-2"
              onClick={() => onTabChange("conversations")}>
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
            ) : (
              messages.slice(-5).reverse().map((m) => (
                <div key={m.id} className={`flex gap-2 p-2 rounded-lg ${m.role === "user" ? "bg-gray-800/50" : "bg-indigo-900/20"}`}>
                  <div className={`w-1.5 rounded-full flex-shrink-0 ${m.role === "user" ? "bg-gray-600" : "bg-indigo-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${m.role === "user" ? "text-gray-400" : "text-indigo-400"}`}>
                        {m.role === "user" ? m.phone : agent.name}
                      </span>
                      <span className="text-[10px] text-gray-600">{fmtTime(m.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-300 truncate">{m.content}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Message Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Area type="monotone" dataKey="messages" stroke="#6366f1" fill="url(#colorMessages)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Conversations Tab ─────────────────────────────────────────
function ConversationsTab({ messages, agent }: { messages: WhatsAppMessage[]; agent: any }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Conversations</h2>
          <p className="text-xs text-gray-500 mt-0.5">{messages.length} messages total</p>
        </div>
        <a href="/whatsapp" target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:text-white text-xs h-8">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open WhatsApp
          </Button>
        </a>
      </div>

      <Card className="bg-gray-900 border-gray-800 flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">No messages yet</p>
                <p className="text-gray-600 text-xs mt-1">Connect WhatsApp to start chatting</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-2.5 ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  {m.role === "assistant" && (
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="bg-indigo-600 text-white text-[10px]">
                        {getInitials(agent.name || "AI")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[72%] ${m.role === "assistant" ? "items-start" : "items-end"} flex flex-col`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-gray-200 rounded-tl-sm"
                    }`}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 px-1">
                      {m.role === "user" ? m.phone + " · " : ""}{fmtTime(m.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────
function RemindersTab({ agentId }: { agentId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState("");
  const [datetime, setDatetime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/reminders`).then(r => r.json())
      .then(d => setReminders(d.reminders || []))
      .finally(() => setLoading(false));
  }, [agentId]);

  async function addReminder() {
    if (!text.trim() || !datetime) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/reminders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, datetime }),
      });
      const data = await res.json();
      if (data.reminder) {
        setReminders(prev => [...prev, data.reminder]);
        setText(""); setDatetime("");
        toast.success("Reminder added!");
      }
    } catch { toast.error("Failed to add reminder"); } finally { setSaving(false); }
  }

  async function deleteReminder(id: string) {
    await fetch(`/api/agents/${agentId}/reminders/${id}`, { method: "DELETE" });
    setReminders(prev => prev.filter(r => r.id !== id));
    toast.success("Reminder deleted");
  }

  function getReminderColor(r: Reminder) {
    if (r.sent) return "border-gray-700 bg-gray-900";
    if (isOverdue(r.datetime)) return "border-red-800/50 bg-red-950/20";
    if (isDueWithin24h(r.datetime)) return "border-yellow-800/50 bg-yellow-950/20";
    return "border-gray-800 bg-gray-900";
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Reminder text..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <Button onClick={addReminder} disabled={saving || !text.trim() || !datetime}
              className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-10">
          <Bell className="w-10 h-10 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No reminders yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()).map((r) => (
            <Card key={r.id} className={`border ${getReminderColor(r)} transition-colors`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                  r.sent ? "bg-gray-800" : isOverdue(r.datetime) ? "bg-red-900/40" : isDueWithin24h(r.datetime) ? "bg-yellow-900/40" : "bg-gray-800"
                }`}>
                  <Bell className={`w-4 h-4 ${
                    r.sent ? "text-gray-500" : isOverdue(r.datetime) ? "text-red-400" : isDueWithin24h(r.datetime) ? "text-yellow-400" : "text-gray-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${r.sent ? "text-gray-500 line-through" : "text-gray-200"}`}>{r.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{fmtDate(r.datetime)} · {fmtTime(r.datetime)}</span>
                    {r.sent && <Badge variant="secondary" className="text-[10px] bg-gray-800 text-gray-500 border-gray-700">Sent</Badge>}
                    {!r.sent && isOverdue(r.datetime) && <Badge className="text-[10px] bg-red-900/40 text-red-400 border-red-800">Overdue</Badge>}
                    {!r.sent && isDueWithin24h(r.datetime) && <Badge className="text-[10px] bg-yellow-900/40 text-yellow-400 border-yellow-800">Due soon</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-red-400"
                  onClick={() => deleteReminder(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bills Tab ────────────────────────────────────────────────
function BillsTab({ agentId }: { agentId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/bills`).then(r => r.json())
      .then(d => setBills(d.bills || []))
      .finally(() => setLoading(false));
  }, [agentId]);

  async function addBill() {
    if (!name.trim() || !amount || !dueDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/bills`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount: parseFloat(amount), dueDate }),
      });
      const data = await res.json();
      if (data.bill) {
        setBills(prev => [...prev, data.bill]);
        setName(""); setAmount(""); setDueDate("");
        toast.success("Bill added!");
      }
    } catch { toast.error("Failed to add bill"); } finally { setSaving(false); }
  }

  async function markPaid(id: string) {
    await fetch(`/api/agents/${agentId}/bills/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true }),
    });
    setBills(prev => prev.map(b => b.id === id ? { ...b, paid: true } : b));
    toast.success("Bill marked as paid!");
  }

  async function deleteBill(id: string) {
    await fetch(`/api/agents/${agentId}/bills/${id}`, { method: "DELETE" });
    setBills(prev => prev.filter(b => b.id !== id));
    toast.success("Bill deleted");
  }

  function getBillBadge(b: Bill) {
    if (b.paid) return <Badge className="text-[10px] bg-green-900/40 text-green-400 border-green-800">Paid</Badge>;
    if (isOverdue(b.dueDate)) return <Badge className="text-[10px] bg-red-900/40 text-red-400 border-red-800">Overdue</Badge>;
    if (isDueSoon(b.dueDate)) return <Badge className="text-[10px] bg-yellow-900/40 text-yellow-400 border-yellow-800">Due soon</Badge>;
    return <Badge variant="secondary" className="text-[10px] bg-gray-800 text-gray-400 border-gray-700">Upcoming</Badge>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bill name..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount ($)"
              className="w-32 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <Button onClick={addBill} disabled={saving || !name.trim() || !amount || !dueDate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading bills...</div>
      ) : bills.length === 0 ? (
        <div className="text-center py-10">
          <DollarSign className="w-10 h-10 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No bills tracked yet. Add one above!</p>
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <div className="divide-y divide-gray-800">
            {bills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${b.paid ? "text-gray-500 line-through" : "text-gray-200"}`}>{b.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Due {fmtDate(b.dueDate)}</p>
                </div>
                <span className={`text-sm font-semibold ${b.paid ? "text-gray-500" : "text-white"}`}>
                  ${b.amount.toFixed(2)}
                </span>
                {getBillBadge(b)}
                {!b.paid && (
                  <Button size="sm" variant="outline" className="border-green-800 text-green-400 hover:bg-green-900/30 text-xs h-7"
                    onClick={() => markPaid(b.id)}>
                    <Check className="w-3 h-3 mr-1" /> Paid
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-red-400"
                  onClick={() => deleteBill(b.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Todos Tab ────────────────────────────────────────────────
function TodosTab({ agentId }: { agentId: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/todos`).then(r => r.json())
      .then(d => setTodos(d.todos || []))
      .finally(() => setLoading(false));
  }, [agentId]);

  async function addTodo(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !text.trim()) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/todos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.todo) { setTodos(prev => [...prev, data.todo]); setText(""); }
    } catch { toast.error("Failed to add todo"); }
  }

  async function toggleTodo(id: string, done: boolean) {
    await fetch(`/api/agents/${agentId}/todos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    });
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/agents/${agentId}/todos/${id}`, { method: "DELETE" });
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  function TodoItem({ t }: { t: Todo }) {
    const [hovered, setHovered] = useState(false);
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg group transition-colors ${t.done ? "opacity-60" : "hover:bg-gray-800/50"}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <button onClick={() => toggleTodo(t.id, t.done)}
          className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
            t.done ? "bg-indigo-600 border-indigo-600" : "border-gray-600 hover:border-indigo-500"
          }`}>
          {t.done && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className={`flex-1 text-sm ${t.done ? "line-through text-gray-500" : "text-gray-200"}`}>{t.text}</span>
        {hovered && (
          <button onClick={() => deleteTodo(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={addTodo}
            placeholder="Add a new to-do (press Enter)"
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading todos...</div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-gray-400" /> To Do
                  <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-[10px]">{pending.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 space-y-0.5">
                {pending.map(t => <TodoItem key={t.id} t={t} />)}
              </CardContent>
            </Card>
          )}

          {done.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Done
                  <Badge variant="secondary" className="bg-gray-800 text-gray-500 border-gray-700 text-[10px]">{done.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 space-y-0.5">
                {done.map(t => <TodoItem key={t.id} t={t} />)}
              </CardContent>
            </Card>
          )}

          {todos.length === 0 && (
            <div className="text-center py-10">
              <CheckSquare className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No to-dos yet. Add one above!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ agent }: { agent: any }) {
  const [name, setName] = useState(agent.name || "");
  const [personality, setPersonality] = useState(agent.personality || "friendly");
  const [quietHours, setQuietHours] = useState("22:00");
  const [digestTime, setDigestTime] = useState("09:00");
  const [dailyDigest, setDailyDigest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, personality }),
      });
      toast.success("Agent profile saved!");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  async function deleteAgent() {
    try {
      await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      toast.success("Agent deleted");
      router.push("/create");
    } catch { toast.error("Failed to delete agent"); }
  }

  const plan = agent.plan || "free";
  const usedToday = Math.floor(Math.random() * 50);
  const planLimits: Record<string, number> = { free: 50, pro: 500, business: 9999 };
  const limit = planLimits[plan] || 50;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Agent Profile */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Agent Profile</CardTitle>
          <CardDescription className="text-xs text-gray-500">Customize your agent's name and personality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Agent Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white" placeholder="e.g. Max" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Personality / Tone</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {["friendly", "professional", "casual", "enthusiastic"].map(v => (
                  <SelectItem key={v} value={v} className="text-white hover:bg-gray-700 capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Notifications</CardTitle>
          <CardDescription className="text-xs text-gray-500">Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Quiet Hours Start</Label>
              <input type="time" value={quietHours} onChange={e => setQuietHours(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Daily Digest Time</Label>
              <input type="time" value={digestTime} onChange={e => setDigestTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/50">
            <div>
              <p className="text-sm font-medium text-gray-200">Daily WhatsApp Digest</p>
              <p className="text-xs text-gray-500">Send a daily summary via WhatsApp</p>
            </div>
            <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
          </div>
          <Button onClick={() => toast.success("Notification preferences saved!")} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Save className="w-4 h-4 mr-2" /> Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Billing / Plan */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-white">Billing & Plan</CardTitle>
              <CardDescription className="text-xs text-gray-500">Your current plan and usage</CardDescription>
            </div>
            <Badge className={`capitalize ${
              plan === "free" ? "bg-gray-800 text-gray-300 border-gray-700" :
              plan === "pro" ? "bg-indigo-900/50 text-indigo-300 border-indigo-700" :
              "bg-yellow-900/50 text-yellow-300 border-yellow-700"
            }`}>{plan}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">Messages today</span>
              <span className="text-gray-300 font-medium">{usedToday} / {limit === 9999 ? "∞" : limit}</span>
            </div>
            <Progress value={limit === 9999 ? 10 : (usedToday / limit) * 100} className="h-2 bg-gray-800" />
          </div>

          <div className="space-y-1.5">
            {plan === "free" && (
              <>
                <p className="text-xs text-gray-400 font-medium mb-2">Free Plan includes:</p>
                {["1 AI agent", "50 messages/day", "WhatsApp integration", "Reminders & bills"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                    <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> {f}
                  </div>
                ))}
              </>
            )}
          </div>

          {plan === "free" && (
            <a href="/upgrade">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                <Zap className="w-4 h-4 mr-2" /> Upgrade to Pro
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-gray-900 border-red-900/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger>
              <Button variant="outline" className="border-red-900 text-red-400 hover:bg-red-900/30 hover:border-red-700">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-red-400">Delete Agent?</DialogTitle>
                <DialogDescription className="text-gray-400">
                  This will permanently delete <strong className="text-white">{agent.name}</strong> and all its data — messages, reminders, bills, todos. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" className="text-gray-400" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button onClick={deleteAgent} className="bg-red-600 hover:bg-red-500 text-white">
                  Yes, delete permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────
function DashboardShell({ agent }: { agent: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [connections, setConnections] = useState<Connections>({});

  useEffect(() => {
    async function loadAll() {
      try {
        const [msgs, rems, bls, tds, conns] = await Promise.allSettled([
          fetch(`/api/agents/${agent.id}/messages`).then(r => r.json()),
          fetch(`/api/agents/${agent.id}/reminders`).then(r => r.json()),
          fetch(`/api/agents/${agent.id}/bills`).then(r => r.json()),
          fetch(`/api/agents/${agent.id}/todos`).then(r => r.json()),
          fetch("/api/connections").then(r => r.json()),
        ]);
        if (msgs.status === "fulfilled") setMessages(msgs.value.messages || []);
        if (rems.status === "fulfilled") setReminders(rems.value.reminders || []);
        if (bls.status === "fulfilled") setBills(bls.value.bills || []);
        if (tds.status === "fulfilled") setTodos(tds.value.todos || []);
        if (conns.status === "fulfilled") setConnections(conns.value || {});
      } catch (e) { console.error("Failed to load dashboard data", e); }
    }
    loadAll();
  }, [agent.id]);

  const SidebarInner = (
    <SidebarContent
      agent={agent}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      connections={connections}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-950 dark:bg-gray-950 text-white flex flex-col">
        <Topbar agent={agent} activeTab={activeTab} onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-56 xl:w-64 flex-shrink-0 h-[calc(100vh-57px)] sticky top-[57px]">
            {SidebarInner}
          </aside>

          {/* Mobile sidebar (Sheet) */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-64 border-gray-800">
              {SidebarInner}
            </SheetContent>
          </Sheet>

          {/* Main content */}
          <main className="flex-1 min-w-0 overflow-auto">
            <div className="p-4 lg:p-6 max-w-5xl mx-auto">
              {activeTab === "overview" && (
                <OverviewTab
                  agent={agent}
                  reminders={reminders}
                  bills={bills}
                  todos={todos}
                  messages={messages}
                  connections={connections}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === "conversations" && <ConversationsTab messages={messages} agent={agent} />}
              {activeTab === "reminders" && <RemindersTab agentId={agent.id} />}
              {activeTab === "bills" && <BillsTab agentId={agent.id} />}
              {activeTab === "todos" && <TodosTab agentId={agent.id} />}
              {activeTab === "settings" && <SettingsTab agent={agent} />}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Public export ────────────────────────────────────────────
export default function TemplateDashboard({ agent, needsSetup: _needsSetup }: { agent: any; needsSetup: boolean }) {
  return <DashboardShell agent={agent} />;
}
