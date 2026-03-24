"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, MessageSquare, Users, Calendar, DollarSign,
  Clock, ChevronRight, PhoneCall, PhoneIncoming, PhoneOutgoing,
  MessageCircle, Bell, TrendingUp, AlertTriangle, CheckCircle,
  Mail, Search, Mic, Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Activity item ───────────────────────────────────────────
function ActivityItem({ icon: Icon, iconColor, title, subtitle, time, status }: {
  icon: any; iconColor: string; title: string; subtitle: string; time: string; status?: "success" | "pending" | "alert";
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-[11px] text-[#A1A1AA] truncate">{subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-[#A1A1AA]">{time}</p>
        {status === "success" && <CheckCircle className="w-3.5 h-3.5 text-green-400 ml-auto mt-0.5" />}
        {status === "pending" && <Clock className="w-3.5 h-3.5 text-amber-400 ml-auto mt-0.5" />}
        {status === "alert" && <AlertTriangle className="w-3.5 h-3.5 text-red-400 ml-auto mt-0.5" />}
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: any; label: string; value: string; trend?: string; color: string;
}) {
  return (
    <div className="bg-[#111111]/80 border border-white/[0.07] rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && <p className="text-[10px] text-[#A1A1AA] mt-0.5">{trend}</p>}
    </div>
  );
}

// ─── Quick action button ─────────────────────────────────────
function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: any; label: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 p-3 bg-[#0d0d0d] border border-white/[0.07] rounded-xl hover:border-white/10 hover:bg-[#1A1A1A]/60 transition-all cursor-pointer group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] text-[#A1A1AA] font-bold group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

// ─── Main Office View ────────────────────────────────────────
export default function OfficeView({ agentName, onChat }: { agentName: string; onChat: (msg: string) => void }) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Demo activity — in production these come from the agent's activity log
  const recentActivity = [
    { icon: PhoneIncoming, iconColor: "bg-blue-500/10 text-blue-400", title: "Call answered", subtitle: "Internet inquiry — scheduled install for Saturday", time: "12 min ago", status: "success" as const },
    { icon: MessageSquare, iconColor: "bg-green-500/10 text-green-400", title: "WhatsApp replied", subtitle: "Sarah Chen — followed up on invoice #1042", time: "34 min ago", status: "success" as const },
    { icon: Calendar, iconColor: "bg-purple-500/10 text-purple-400", title: "Meeting booked", subtitle: "Mike Davis — Thursday 2 PM, site survey", time: "1 hr ago", status: "success" as const },
    { icon: PhoneIncoming, iconColor: "bg-amber-500/10 text-amber-400", title: "Missed call", subtitle: "+1 (767) 555-9876 — no voicemail left", time: "2 hr ago", status: "alert" as const },
    { icon: Mail, iconColor: "bg-red-500/10 text-red-400", title: "Email sent", subtitle: "Quote #247 sent to Burton & Co", time: "3 hr ago", status: "success" as const },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
        <p className="text-[#A1A1AA] text-xs">{greeting} · {timeStr}</p>
        <h2 className="text-xl font-bold mt-0.5">Here&apos;s your business</h2>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-2.5">
        <StatCard icon={PhoneIncoming} label="Calls" value="7" trend="3 today" color="text-blue-400" />
        <StatCard icon={MessageSquare} label="Messages" value="23" trend="12 today" color="text-green-400" />
        <StatCard icon={DollarSign} label="Overdue" value="$2.4k" trend="3 invoices" color="text-amber-400" />
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={PhoneCall} label="Call" color="bg-blue-500/10 text-blue-400" onClick={() => onChat("Call someone for me")} />
          <QuickAction icon={MessageCircle} label="Message" color="bg-green-500/10 text-green-400" onClick={() => onChat("Send a message")} />
          <QuickAction icon={DollarSign} label="Collect" color="bg-amber-500/10 text-amber-400" onClick={() => onChat("Follow up on overdue invoices")} />
          <QuickAction icon={Calendar} label="Schedule" color="bg-purple-500/10 text-purple-400" onClick={() => onChat("What's on my schedule today?")} />
        </div>
      </motion.div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Recent Activity</p>
          <p className="text-[10px] text-[#A1A1AA]">{agentName} handled these for you</p>
        </div>
        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-xl px-4">
          {recentActivity.map((item, i) => (
            <ActivityItem key={i} {...item} />
          ))}
        </div>
      </motion.div>

      {/* Agent status bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-[#111111]/40 border border-white/[0.07] rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-white">{agentName} is working</p>
          <p className="text-[10px] text-[#A1A1AA]">Answering calls · Replying on WhatsApp · Monitoring inbox</p>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </motion.div>
    </div>
  );
}
