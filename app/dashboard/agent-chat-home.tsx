"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send, User, Phone, MessageSquare, Users, Settings,
  Sparkles, Zap, Paperclip, Eye, BookOpen, ChevronRight, ChevronDown,
  MoreHorizontal, LogOut, ArrowRight, CheckCircle, Loader2,
  Upload, Mail, Calendar, Globe, Brain, PhoneCall, Clock,
  ShieldCheck, Bot, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import OfficeView from "./office-view";

interface Message { id: string; role: "user" | "assistant"; text: string; timestamp: Date }

const PERSONA_COLORS: Record<string, { bg: string; glow: string; border: string; accent: string }> = {
  professional: { bg: "from-slate-700 to-slate-800", glow: "shadow-blue-500/20", border: "border-blue-500/30", accent: "text-blue-400" },
  friendly: { bg: "from-amber-600 to-orange-700", glow: "shadow-amber-500/20", border: "border-amber-500/30", accent: "text-amber-400" },
  casual: { bg: "from-emerald-600 to-teal-700", glow: "shadow-emerald-500/20", border: "border-emerald-500/30", accent: "text-emerald-400" },
  enthusiastic: { bg: "from-violet-600 to-fuchsia-700", glow: "shadow-violet-500/20", border: "border-violet-500/30", accent: "text-violet-400" },
  empathetic: { bg: "from-rose-600 to-pink-700", glow: "shadow-rose-500/20", border: "border-rose-500/30", accent: "text-rose-400" },
};
const DEFAULT_COLORS = { bg: "from-indigo-600 to-violet-700", glow: "shadow-indigo-500/20", border: "border-indigo-500/30", accent: "text-indigo-400" };
const NAV_ITEMS = [
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/settings", icon: Settings, label: "Personality" },
  { href: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
  { href: "/number", icon: Phone, label: "Phone" },
  { href: "/knowledge", icon: BookOpen, label: "Knowledge" },
  { href: "/integrations", icon: Zap, label: "Integrations" },
  { href: "/admin", icon: Eye, label: "Supervise" },
];

// ─── Animated chat bubble that types in ──────────────────────
function TypedBubble({ text, from, align, delay = 0, color = "bg-gray-800" }: { text: string; from: string; align: "left" | "right"; delay?: number; color?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}
      className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${color} rounded-2xl ${align === "right" ? "rounded-br-sm" : "rounded-bl-sm"} px-3.5 py-2.5`}>
        <p className="text-sm text-gray-200 leading-relaxed">{text}</p>
        <p className="text-[9px] text-gray-500 mt-1 text-right">{from}</p>
      </div>
    </motion.div>
  );
}

// ─── SIMULATION: WhatsApp ────────────────────────────────────
function WhatsAppSim({ agentName }: { agentName: string }) {
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="bg-green-900/40 px-3 py-2 flex items-center gap-2 border-b border-gray-700/50">
        <MessageSquare className="w-3.5 h-3.5 text-green-400" />
        <span className="text-[11px] font-bold text-green-400">WhatsApp</span>
        <span className="text-[10px] text-gray-500 ml-auto">Customer → You</span>
      </div>
      <div className="p-3 space-y-2.5 min-h-[140px]">
        <TypedBubble text="Hi, is your internet service available in my area?" from="Customer · 2:34 AM" align="left" delay={300} color="bg-gray-700/60" />
        <TypedBubble text={`Yes! We cover your area. Our plans start at $49/mo with speeds up to 100 Mbps. Want me to set up an appointment for installation?\n\n— ${agentName}`} from={`${agentName} · 2:34 AM`} align="right" delay={1200} color="bg-green-700/40" />
        <TypedBubble text="That sounds great! Can you do Saturday morning?" from="Customer · 2:35 AM" align="left" delay={2200} color="bg-gray-700/60" />
        <TypedBubble text={`Saturday 10 AM works! I've booked you in. You'll get a confirmation text shortly. 👍\n\n— ${agentName}`} from={`${agentName} · 2:35 AM`} align="right" delay={3200} color="bg-green-700/40" />
      </div>
      <div className="bg-green-900/20 px-3 py-2 border-t border-gray-700/50">
        <p className="text-[10px] text-green-400/80 text-center">💤 This happened at 2 AM while you were sleeping</p>
      </div>
    </div>
  );
}

// ─── SIMULATION: Phone Call ──────────────────────────────────
function PhoneSim({ agentName }: { agentName: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 800), setTimeout(() => setStage(2), 2000), setTimeout(() => setStage(3), 3500), setTimeout(() => setStage(4), 5000)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="bg-blue-900/40 px-3 py-2 flex items-center gap-2 border-b border-gray-700/50">
        <Phone className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[11px] font-bold text-blue-400">Incoming Call</span>
        <span className="text-[10px] text-gray-500 ml-auto">+1 (767) 555-1234</span>
      </div>
      <div className="p-4 space-y-3 min-h-[140px]">
        {stage >= 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Phone ringing...</p>
              <p className="text-[10px] text-gray-500">Unknown number calling</p>
            </div>
          </motion.div>
        )}
        {stage >= 1 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-green-400 font-bold">{agentName} picks up</p>
              <p className="text-[10px] text-gray-400 italic">&quot;Hi! Thanks for calling. How can I help you today?&quot;</p>
            </div>
          </motion.div>
        )}
        {stage >= 2 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600/30 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 italic">&quot;I&apos;m having trouble with my internet. It keeps dropping.&quot;</p>
            </div>
          </motion.div>
        )}
        {stage >= 3 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 italic">&quot;I&apos;m sorry to hear that. Let me check your account... I see some signal issues. I&apos;ll schedule a technician for tomorrow. Does 10 AM work?&quot;</p>
            </div>
          </motion.div>
        )}
        {stage >= 4 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-[10px] text-gray-400"><strong className="text-blue-400">You get notified:</strong> &quot;Call handled — technician booked for tomorrow 10 AM for internet issue.&quot;</p>
          </motion.div>
        )}
      </div>
      <div className="bg-blue-900/20 px-3 py-2 border-t border-gray-700/50">
        <p className="text-[10px] text-blue-400/80 text-center">📞 {agentName} handled the whole call — you just got the summary</p>
      </div>
    </div>
  );
}

// ─── SIMULATION: Contacts / Outreach ─────────────────────────
function ContactsSim({ agentName }: { agentName: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 600), setTimeout(() => setStage(2), 1500), setTimeout(() => setStage(3), 2500), setTimeout(() => setStage(4), 3500)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="bg-violet-900/40 px-3 py-2 flex items-center gap-2 border-b border-gray-700/50">
        <Users className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[11px] font-bold text-violet-400">Outreach</span>
        <span className="text-[10px] text-gray-500 ml-auto">3 contacts</span>
      </div>
      <div className="p-3 space-y-2 min-h-[120px]">
        {stage >= 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-gray-500 mb-2">
            You say: <span className="text-white italic">&quot;Follow up with everyone who has an overdue invoice&quot;</span>
          </motion.div>
        )}
        {[
          { name: "Sarah C.", msg: "Hi Sarah, just a friendly reminder about invoice #1042...", delay: 1 },
          { name: "Mike D.", msg: "Hey Mike, checking in on the outstanding balance...", delay: 2 },
          { name: "Burton & Co", msg: "Good morning! Just following up on the quarterly payment...", delay: 3 },
        ].map((c, i) => stage >= c.delay && (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 py-1.5 px-2.5 bg-gray-700/30 rounded-lg">
            <div className="w-7 h-7 bg-violet-600/20 rounded-full flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0">
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white">{c.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{c.msg}</p>
            </div>
            <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          </motion.div>
        ))}
        {stage >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-1">
            <p className="text-[10px] text-green-400 font-bold">✅ 3 messages sent in 4 seconds</p>
          </motion.div>
        )}
      </div>
      <div className="bg-violet-900/20 px-3 py-2 border-t border-gray-700/50">
        <p className="text-[10px] text-violet-400/80 text-center">👥 One command → {agentName} reaches everyone</p>
      </div>
    </div>
  );
}

// ─── SIMULATION: Knowledge Base ──────────────────────────────
function KnowledgeSim({ agentName }: { agentName: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 500), setTimeout(() => setStage(2), 1500), setTimeout(() => setStage(3), 2800)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="bg-amber-900/40 px-3 py-2 flex items-center gap-2 border-b border-gray-700/50">
        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-bold text-amber-400">Knowledge in Action</span>
      </div>
      <div className="p-3 space-y-2.5 min-h-[120px]">
        {stage >= 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-start">
            <div className="w-6 h-6 bg-gray-600/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3 h-3 text-gray-400" />
            </div>
            <div className="bg-gray-700/50 rounded-xl rounded-bl-sm px-3 py-2">
              <p className="text-[11px] text-gray-300">&quot;What are your internet plans and pricing?&quot;</p>
            </div>
          </motion.div>
        )}
        {stage >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2">
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
            <p className="text-[10px] text-amber-400">Checking your pricing doc...</p>
          </motion.div>
        )}
        {stage >= 2 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-start justify-end">
            <div className="bg-amber-700/20 border border-amber-600/20 rounded-xl rounded-br-sm px-3 py-2 max-w-[85%]">
              <p className="text-[11px] text-gray-200">We have three plans:</p>
              <p className="text-[11px] text-gray-300 mt-1">📶 <strong>Basic</strong> — $49/mo, 50 Mbps</p>
              <p className="text-[11px] text-gray-300">🚀 <strong>Pro</strong> — $79/mo, 100 Mbps</p>
              <p className="text-[11px] text-gray-300">⚡ <strong>Ultra</strong> — $129/mo, 300 Mbps</p>
              <p className="text-[11px] text-gray-300 mt-1">All plans include free installation. Want me to sign you up?</p>
              <p className="text-[9px] text-gray-500 mt-1 text-right">from pricing-2026.pdf</p>
            </div>
          </motion.div>
        )}
        {stage >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 px-2">
            <FileText className="w-3 h-3 text-amber-400" />
            <p className="text-[10px] text-gray-500">Answer sourced from <strong className="text-amber-400">your docs</strong> — not made up</p>
          </motion.div>
        )}
      </div>
      <div className="bg-amber-900/20 px-3 py-2 border-t border-gray-700/50">
        <p className="text-[10px] text-amber-400/80 text-center">📚 {agentName} quotes YOUR prices, not random ones</p>
      </div>
    </div>
  );
}

// ─── SIMULATION: Integrations ────────────────────────────────
function IntegrationsSim({ agentName }: { agentName: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 500), setTimeout(() => setStage(2), 1200), setTimeout(() => setStage(3), 2200), setTimeout(() => setStage(4), 3200)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="bg-yellow-900/40 px-3 py-2 flex items-center gap-2 border-b border-gray-700/50">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-[11px] font-bold text-yellow-400">Connected Tools</span>
      </div>
      <div className="p-3 space-y-2.5 min-h-[120px]">
        {stage >= 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-gray-500">
            You say: <span className="text-white italic">&quot;Book a meeting with Sarah for Thursday and email her the details&quot;</span>
          </motion.div>
        )}
        {[
          { icon: Calendar, text: "Checking your calendar for Thursday...", color: "text-blue-400", s: 1 },
          { icon: Calendar, text: "✅ Thursday 2 PM is free — meeting booked!", color: "text-green-400", s: 2 },
          { icon: Mail, text: "📧 Email sent to sarah@burton.dm with meeting details", color: "text-green-400", s: 3 },
        ].map((item, i) => stage >= item.s && (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 py-1.5 px-2.5 bg-gray-700/20 rounded-lg">
            <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
            <p className="text-[11px] text-gray-300">{item.text}</p>
          </motion.div>
        ))}
        {stage >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-1">
            <p className="text-[10px] text-yellow-400 font-bold">One sentence → two tools → done in 3 seconds</p>
          </motion.div>
        )}
      </div>
      <div className="bg-yellow-900/20 px-3 py-2 border-t border-gray-700/50">
        <p className="text-[10px] text-yellow-400/80 text-center">⚡ {agentName} uses your tools like you would</p>
      </div>
    </div>
  );
}

// ─── Wizard wrappers with sim → setup ────────────────────────
function CapabilityWizard({ id, agentName, onDone, contacts }: { id: string; agentName: string; onDone: () => void; contacts: any[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"sim" | "setup" | "done">("sim");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [number, setNumber] = useState("");

  const saveWhatsApp = async () => {
    if (!phone.trim()) return toast.error("Enter your WhatsApp number");
    setSaving(true);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsappNumber: phone.trim() }) });
      if (!res.ok) throw new Error("Failed");
      onDone(); setPhase("done"); toast.success("WhatsApp connected!");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  const provisionPhone = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/number/provision", { method: "POST" });
      const data = await res.json();
      if (data.did) { setNumber(data.did); setPhase("done"); onDone(); toast.success(`Number: ${data.did}`); }
      else throw new Error(data.error || "Failed");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const addContact = async () => {
    const text = quickInput.trim();
    if (!text) return;
    const phoneMatch = text.match(/(\+?\d[\d\s\-()]{7,})/);
    const emailMatch = text.match(/([^\s]+@[^\s]+\.[^\s]+)/);
    let name = text;
    const p = phoneMatch?.[1]?.replace(/[\s\-()]/g, "") || "";
    const email = emailMatch?.[1] || "";
    if (phoneMatch) name = name.replace(phoneMatch[0], "").trim();
    if (emailMatch) name = name.replace(emailMatch[0], "").trim();
    name = name.replace(/^[\s,\-]+|[\s,\-]+$/g, "").trim();
    if (!name || (!p && !email)) return toast.error("Include a name + phone or email");
    try {
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone: p, email }) });
      if (!res.ok) throw new Error("Failed");
      setAdded(prev => [...prev, name]); setQuickInput(""); if (added.length === 0) onDone();
      toast.success(`Added ${name}`);
    } catch (e: any) { toast.error(e.message); }
  };

  // ─── WhatsApp ───
  if (id === "whatsapp") return (
    <div className="space-y-4">
      {phase === "sim" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <WhatsAppSim agentName={agentName} />
          <button onClick={() => setPhase("setup")} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all cursor-pointer">I want this — set it up →</button>
        </motion.div>
      )}
      {phase === "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <label className="text-xs font-bold text-gray-500 block">Your WhatsApp phone number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input type="tel" placeholder="+1 767 295 8382" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && saveWhatsApp()}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500 focus:outline-none text-sm" />
          </div>
          <p className="text-[10px] text-gray-600">Include country code. {agentName} will message from this number.</p>
          <div className="flex gap-2">
            <button onClick={() => setPhase("sim")} className="px-4 py-3 text-sm text-gray-500 hover:text-white rounded-xl cursor-pointer">← Back</button>
            <button onClick={saveWhatsApp} disabled={saving} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saving ? "Connecting..." : "Connect WhatsApp"}
            </button>
          </div>
        </motion.div>
      )}
      {phase === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3 space-y-2">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
          <p className="font-bold text-green-400">WhatsApp connected!</p>
          <p className="text-xs text-gray-500">Just like the demo — {agentName} will handle messages for you 24/7.</p>
        </motion.div>
      )}
    </div>
  );

  // ─── Phone ───
  if (id === "phone") return (
    <div className="space-y-4">
      {phase === "sim" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <PhoneSim agentName={agentName} />
          <button onClick={() => setPhase("setup")} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all cursor-pointer">I want this — get a number →</button>
        </motion.div>
      )}
      {phase === "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-300">We&apos;ll assign a phone number to <strong className="text-white">{agentName}</strong>.</p>
            <p className="text-xs text-gray-500 mt-2">People call → {agentName} answers. Just like the demo.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPhase("sim")} className="px-4 py-3 text-sm text-gray-500 hover:text-white rounded-xl cursor-pointer">← Back</button>
            <button onClick={provisionPhone} disabled={saving} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />} {saving ? "Setting up..." : "Assign Number"}
            </button>
          </div>
        </motion.div>
      )}
      {phase === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3 space-y-3">
          <CheckCircle className="w-10 h-10 text-blue-400 mx-auto" />
          <p className="font-bold text-blue-400">Phone number assigned!</p>
          <p className="text-3xl font-mono text-white">{number}</p>
          <a href={`tel:${number.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 cursor-pointer">
            <PhoneCall className="w-4 h-4" /> Call it — hear {agentName} answer
          </a>
          <p className="text-[10px] text-gray-600">Try from your phone — it works just like the demo above!</p>
        </motion.div>
      )}
    </div>
  );

  // ─── Contacts ───
  if (id === "contacts") return (
    <div className="space-y-4">
      {phase === "sim" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <ContactsSim agentName={agentName} />
          <button onClick={() => setPhase("setup")} className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all cursor-pointer">Add my contacts →</button>
        </motion.div>
      )}
      {phase === "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <label className="text-xs font-bold text-gray-500 block">Type name + phone or email</label>
          <div className="flex gap-2">
            <input type="text" placeholder='e.g. "Sarah Chen +17675551234"' value={quickInput} onChange={e => setQuickInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addContact()}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none text-sm" />
            <button onClick={addContact} disabled={!quickInput.trim()} className="px-5 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-30 cursor-pointer">Add</button>
          </div>
          {added.map((name, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs py-1.5 px-3 bg-gray-800/50 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> <strong className="text-white">{name}</strong> added
            </motion.div>
          ))}
          <div className="flex items-center justify-between">
            <button onClick={() => setPhase("sim")} className="text-xs text-gray-500 hover:text-white cursor-pointer">← Back</button>
            <button onClick={() => router.push("/contacts")} className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer flex items-center gap-1">Import CSV / bulk <ArrowRight className="w-3 h-3" /></button>
          </div>
          {added.length >= 1 && (
            <p className="text-[10px] text-gray-500 text-center">✅ {agentName} can now reach {added.join(", ")} — just like the demo!</p>
          )}
        </motion.div>
      )}
    </div>
  );

  // ─── Knowledge ───
  if (id === "knowledge") return (
    <div className="space-y-4">
      <KnowledgeSim agentName={agentName} />
      <button onClick={() => router.push("/knowledge")} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all cursor-pointer flex items-center justify-center gap-2">
        <Upload className="w-4 h-4" /> Upload my docs →
      </button>
      <p className="text-[10px] text-gray-600 text-center">PDF, TXT, DOCX — your pricing, FAQ, product info, anything.</p>
    </div>
  );

  // ─── Integrations ───
  return (
    <div className="space-y-4">
      <IntegrationsSim agentName={agentName} />
      <button onClick={() => router.push("/integrations")} className="w-full py-3 bg-yellow-600 text-white rounded-xl font-bold text-sm hover:bg-yellow-700 transition-all cursor-pointer">Connect my tools →</button>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export default function AgentChatHome() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [agentName, setAgentName] = useState("Your Agent");
  const [agentTone, setAgentTone] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [view, setView] = useState<"welcome" | "office" | "chat">("welcome");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [completedCards, setCompletedCards] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = PERSONA_COLORS[agentTone] || DEFAULT_COLORS;

  useEffect(() => {
    fetch("/api/agent").then(r => r.json()).then(d => {
      if (d.agent?.config?.name) setAgentName(d.agent.config.name);
      if (d.agent?.config?.tone) setAgentTone(d.agent.config.tone);
      const done: string[] = [];
      if (d.agent?.whatsappNumber) done.push("whatsapp");
      if (d.agent?.phoneNumber) done.push("phone");
      if (d.agent?.contacts?.length > 0) done.push("contacts");
      setCompletedCards(done);
      // If they've set up 2+ things, show the office view by default
      if (done.length >= 2) setView("office");
    }).catch(() => {});
    fetch("/api/contacts").then(r => r.json()).then(d => setContacts(d.contacts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", text: text.trim(), timestamp: new Date() }]);
    setInput(""); setTyping(true); setView("chat");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text.trim() }) });
      const data = await res.json();
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: data.reply || "I couldn't process that.", timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Connection issue. Try again.", timestamp: new Date() }]);
    } finally { setTyping(false); inputRef.current?.focus(); }
  }, [typing]);

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };
  const toggleCard = (id: string) => setExpandedCard(expandedCard === id ? null : id);
  const markDone = (id: string) => setCompletedCards(prev => prev.includes(id) ? prev : [...prev, id]);

  const CAPABILITIES = [
    { id: "whatsapp", icon: MessageSquare, title: "Chat on WhatsApp", desc: "Respond to messages, follow up, even while you sleep", color: "text-green-400 bg-green-500/10", accent: "border-green-500/30" },
    { id: "phone", icon: Phone, title: "Answer phone calls", desc: "AI receptionist — picks up, handles it, notifies you", color: "text-blue-400 bg-blue-500/10", accent: "border-blue-500/30" },
    { id: "contacts", icon: Users, title: "Reach out to people", desc: "Message everyone at once with one command", color: "text-violet-400 bg-violet-500/10", accent: "border-violet-500/30" },
    { id: "knowledge", icon: BookOpen, title: "Know your business", desc: "Answer questions from your actual docs — no guessing", color: "text-amber-400 bg-amber-500/10", accent: "border-amber-500/30" },
    { id: "integrations", icon: Zap, title: "Use your tools", desc: "Calendar, email, search — one command does it all", color: "text-yellow-400 bg-yellow-500/10", accent: "border-yellow-500/30" },
  ];

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col relative overflow-hidden">
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b ${colors.bg} opacity-10 blur-[100px] rounded-full`} />

      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView(completedCards.length >= 2 ? "office" : "welcome"); setExpandedCard(null); setMessages([]); }}>
          <div className={`w-9 h-9 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center text-white shadow-lg ${colors.glow} text-sm font-bold`}>{agentName[0]?.toUpperCase()}</div>
          <div><h1 className="font-bold text-sm">{agentName}</h1><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /><span className="text-[10px] text-gray-500">Online</span></div></div>
        </div>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.slice(0, 4).map(item => (
            <button key={item.href} onClick={() => router.push(item.href)} className="p-2.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer" title={item.label}><item.icon className="w-4 h-4" /></button>
          ))}
          <button onClick={() => setShowNav(!showNav)} className="p-2.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>

      <AnimatePresence>
        {showNav && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-14 right-4 z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-2 min-w-[180px]">
            {NAV_ITEMS.map(item => (
              <button key={item.href} onClick={() => { router.push(item.href); setShowNav(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"><item.icon className="w-4 h-4" /> {item.label}</button>
            ))}
            <div className="border-t border-gray-800 mt-1 pt-1">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-xl transition-all cursor-pointer"><LogOut className="w-4 h-4" /> Logout</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 relative z-10">
        {view === "office" && messages.length === 0 ? (
          <OfficeView agentName={agentName} onChat={(msg) => send(msg)} />
        ) : view === "welcome" && messages.length === 0 ? (
          <div className="max-w-xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 pt-2">
              <div className={`w-16 h-16 bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center shadow-2xl ${colors.glow} mx-auto mb-3`}><span className="text-2xl font-bold">{agentName[0]?.toUpperCase()}</span></div>
              <h2 className="text-xl font-bold">I&apos;m {agentName}</h2>
              <p className="text-gray-500 text-xs mt-1">Tap any card to see me in action ↓</p>
            </motion.div>

            <div className="space-y-2.5">
              {CAPABILITIES.map((cap, i) => {
                const done = completedCards.includes(cap.id);
                const isOpen = expandedCard === cap.id;
                return (
                  <motion.div key={cap.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06 }}
                    className={`bg-gray-900/80 border rounded-2xl transition-all overflow-hidden ${isOpen ? cap.accent : "border-gray-800 hover:border-gray-700"}`}>
                    <button onClick={() => toggleCard(cap.id)} className="w-full flex items-center gap-3 p-4 text-left cursor-pointer">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done && !isOpen ? "bg-green-500/10" : cap.color}`}>
                        {done && !isOpen ? <CheckCircle className="w-5 h-5 text-green-400" /> : <cap.icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm ${done && !isOpen ? "text-gray-500" : "text-white"}`}>{cap.title}</h3>
                        {!isOpen && <p className="text-xs text-gray-500 mt-0.5">{cap.desc}</p>}
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-4 pb-4">
                            <CapabilityWizard id={cap.id} agentName={agentName} onDone={() => markDone(cap.id)} contacts={contacts} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} onClick={() => router.push("/settings")}
              className="w-full mt-3 p-3 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center gap-3 hover:border-gray-700 transition-all cursor-pointer group">
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Change my name, personality, or how much freedom I get</span>
              <ChevronRight className="w-4 h-4 text-gray-700 ml-auto group-hover:text-white transition-colors" />
            </motion.button>

            <div className="mt-6 mb-3"><div className="flex items-center gap-4"><div className="flex-1 h-px bg-gray-800" /><span className="text-xs text-gray-600">or just ask me anything</span><div className="flex-1 h-px bg-gray-800" /></div></div>
            <div className="flex flex-wrap gap-2 justify-center pb-4">
              {["What can you do?", "Message someone for me", "What's on my schedule?", "Draft an email"].map(q => (
                <button key={q} onClick={() => send(q)} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400 hover:text-white hover:border-gray-600 transition-all cursor-pointer">{q}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <div className={`w-7 h-7 bg-gradient-to-br ${colors.bg} rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold mt-1`}>{agentName[0]?.toUpperCase()}</div>}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? `bg-gradient-to-br ${colors.bg} text-white rounded-br-md` : "bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-md"}`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/40" : "text-gray-600"}`}>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {msg.role === "user" && <div className="w-7 h-7 bg-gray-800 rounded-lg shrink-0 flex items-center justify-center text-gray-400 mt-1"><User className="w-3.5 h-3.5" /></div>}
                </motion.div>
              ))}
            </AnimatePresence>
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                <div className={`w-7 h-7 bg-gradient-to-br ${colors.bg} rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold`}>{agentName[0]?.toUpperCase()}</div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1.5"><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.15s]" /><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.3s]" /></div></div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 px-4 md:px-6 pb-5 pt-2">
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
          <div className={`flex items-center gap-2 bg-gray-900 border ${colors.border} rounded-2xl p-2 pr-3 transition-all focus-within:border-opacity-60`}>
            <button type="button" className="p-2 text-gray-600 hover:text-gray-400 rounded-lg transition-all cursor-pointer"><Paperclip className="w-4 h-4" /></button>
            <input ref={inputRef} type="text" placeholder={`Talk to ${agentName}...`} className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-gray-200 placeholder:text-gray-600" value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" disabled={!input.trim() || typing} className={`bg-gradient-to-br ${colors.bg} text-white p-2 rounded-lg disabled:opacity-30 transition-all cursor-pointer`}><Send className="w-4 h-4" /></button>
          </div>
        </form>
      </div>
      {showNav && <div className="fixed inset-0 z-40" onClick={() => setShowNav(false)} />}
    </div>
  );
}
