"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ChevronRight,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Brain,
  Shield,
  Heart,
  Zap,
  Eye,
  Volume2,
  Bot,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

/*
 * CREATION FLOW
 * 
 * Psychology: This isn't a settings form. It's a ritual.
 * You're bringing a person into existence, step by step.
 * Each step reveals more of who they are.
 *
 * Inspired by:
 * - Replika: Conversational onboarding (26 steps, feels like a quiz)
 * - Tamagotchi: Emotional bond through creation → responsibility
 * - The Sims: Character creation IS the experience
 * - Character.AI: Personality persistence creates "presence"
 *
 * Key design principles:
 * 1. One question at a time (no form overwhelm)
 * 2. Each choice visually transforms the "person"
 * 3. The agent responds to your choices in real-time
 * 4. By the end, they feel ALIVE — not configured
 */

type Step = {
  id: string;
  question: string;
  subtext?: string;
  type: "text" | "choice" | "multi" | "reveal";
  options?: { value: string; label: string; emoji: string; desc?: string }[];
  field?: string;
  placeholder?: string;
};

const STEPS: Step[] = [
  {
    id: "intro",
    question: "Let's bring someone to life.",
    subtext: "You're about to create an AI that works for you — talks to people, handles tasks, remembers everything. But first, they need a soul.",
    type: "reveal",
  },
  {
    id: "name",
    question: "What's their name?",
    subtext: "This is the first thing anyone will hear when they meet your AI.",
    type: "text",
    field: "name",
    placeholder: "Luna, Max, Aria, Atlas...",
  },
  {
    id: "personality",
    question: "What kind of presence should they have?",
    subtext: "Think of someone you'd trust to represent you.",
    type: "choice",
    field: "tone",
    options: [
      { value: "professional", label: "The Executive", emoji: "🎯", desc: "Precise, confident, gets to the point" },
      { value: "friendly", label: "The Ally", emoji: "🤝", desc: "Warm, approachable, makes people comfortable" },
      { value: "casual", label: "The Friend", emoji: "😎", desc: "Relaxed, natural, like texting a buddy" },
      { value: "enthusiastic", label: "The Spark", emoji: "⚡", desc: "Energetic, positive, infectious enthusiasm" },
      { value: "empathetic", label: "The Listener", emoji: "💜", desc: "Thoughtful, patient, deeply understanding" },
    ],
  },
  {
    id: "purpose",
    question: "What will they do for you?",
    subtext: "Pick their main mission. You can refine it later.",
    type: "choice",
    field: "purpose",
    options: [
      { value: "Handle customer support and answer questions", label: "Customer Support", emoji: "🎧", desc: "Answer questions, resolve issues, keep clients happy" },
      { value: "Manage sales outreach and close deals", label: "Sales & Outreach", emoji: "💰", desc: "Follow up with leads, send proposals, close deals" },
      { value: "Schedule appointments and manage my calendar", label: "Scheduling", emoji: "📅", desc: "Book meetings, send reminders, manage your time" },
      { value: "Be my personal assistant for daily tasks", label: "Personal Assistant", emoji: "✨", desc: "Emails, messages, reminders, whatever you need" },
      { value: "Handle operations and team coordination", label: "Operations", emoji: "⚙️", desc: "Coordinate tasks, track progress, keep things moving" },
      { value: "Collect payments and follow up on invoices", label: "Collections", emoji: "💳", desc: "Chase overdue invoices, send payment reminders" },
    ],
  },
  {
    id: "abilities",
    question: "Give them abilities.",
    subtext: "Each one is a new superpower. Start with what matters most.",
    type: "multi",
    field: "tools",
    options: [
      { value: "whatsapp", label: "WhatsApp", emoji: "💬", desc: "Message people on your behalf" },
      { value: "phone", label: "Phone Calls", emoji: "📞", desc: "Call and receive calls" },
      { value: "email", label: "Email", emoji: "📧", desc: "Send and read emails" },
      { value: "calendar", label: "Calendar", emoji: "📅", desc: "Schedule and manage events" },
      { value: "knowledge", label: "Knowledge Base", emoji: "🧠", desc: "Learn from your documents" },
      { value: "web", label: "Web Search", emoji: "🌐", desc: "Research anything online" },
    ],
  },
  {
    id: "trust",
    question: "How much freedom do they get?",
    subtext: "You can always change this later.",
    type: "choice",
    field: "approvalMode",
    options: [
      { value: "confirm", label: "Check with me first", emoji: "🔒", desc: "Shows you what they'll do before doing it" },
      { value: "notify", label: "Act, then tell me", emoji: "📋", desc: "Gets things done, keeps you in the loop" },
      { value: "auto", label: "Full autonomy", emoji: "🚀", desc: "Handles everything independently" },
    ],
  },
  {
    id: "birth",
    question: "",
    subtext: "",
    type: "reveal",
  },
];

// Personality-based avatar colors
const PERSONA_COLORS: Record<string, { bg: string; accent: string; glow: string }> = {
  professional: { bg: "from-slate-800 to-slate-900", accent: "text-blue-400", glow: "shadow-blue-500/30" },
  friendly: { bg: "from-amber-500 to-orange-600", accent: "text-amber-200", glow: "shadow-amber-500/30" },
  casual: { bg: "from-emerald-500 to-teal-600", accent: "text-emerald-200", glow: "shadow-emerald-500/30" },
  enthusiastic: { bg: "from-violet-500 to-fuchsia-600", accent: "text-violet-200", glow: "shadow-violet-500/30" },
  empathetic: { bg: "from-rose-500 to-pink-600", accent: "text-rose-200", glow: "shadow-rose-500/30" },
};

export default function CreationFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Record<string, any>>({
    name: "",
    tone: "",
    purpose: "",
    tools: [],
    approvalMode: "confirm",
  });
  const [inputVal, setInputVal] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [agentReply, setAgentReply] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[step];
  const colors = PERSONA_COLORS[config.tone] || { bg: "from-indigo-500 to-violet-600", accent: "text-indigo-200", glow: "shadow-indigo-500/30" };

  useEffect(() => {
    if (currentStep?.type === "text") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step]);

  // Generate a live "agent response" when certain steps complete
  useEffect(() => {
    if (step === STEPS.length - 1 && config.name) {
      // Birth step
      const responses = [
        `I'm here. My name is ${config.name}, and I'm ready to work for you.`,
        `Hello. I'm ${config.name}. Tell me what you need.`,
        `${config.name}, online. Let's get to work.`,
      ];
      const personalityResponses: Record<string, string> = {
        professional: `${config.name} here. I'm ready to handle things. What's first?`,
        friendly: `Hey! I'm ${config.name} 👋 So excited to get started — what can I do for you?`,
        casual: `Yo, ${config.name} here. Ready when you are.`,
        enthusiastic: `I'm ${config.name}!! ⚡ I can already feel the possibilities — let's DO this!`,
        empathetic: `Hi there. I'm ${config.name}. I'm here to listen and help however you need. What's on your mind?`,
      };
      setAgentReply(personalityResponses[config.tone] || responses[0]);
    }
  }, [step, config.name, config.tone]);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleTextSubmit = () => {
    if (!inputVal.trim()) return;
    const field = currentStep.field!;
    setConfig((prev) => ({ ...prev, [field]: inputVal.trim() }));
    setInputVal("");
    next();
  };

  const handleChoice = (value: string) => {
    const field = currentStep.field!;
    setConfig((prev) => ({ ...prev, [field]: value }));
    setTimeout(next, 300);
  };

  const handleMulti = (value: string) => {
    setConfig((prev) => {
      const tools = prev.tools.includes(value)
        ? prev.tools.filter((t: string) => t !== value)
        : [...prev.tools, value];
      return { ...prev, tools };
    });
  };

  const deploy = async () => {
    setDeploying(true);
    try {
      // Save agent config
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          purpose: config.purpose,
          tools: config.tools,
          config: {
            name: config.name,
            purpose: config.purpose,
            tone: config.tone,
            tools: config.tools,
            approvalMode: config.approvalMode,
            role: "Personal Assistant",
            language: "English",
          },
        }),
      });

      toast.success(`${config.name} is alive.`);
      router.push("/dashboard");
    } catch (e: any) {
      toast.error("Something went wrong");
      setDeploying(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background */}
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${colors.bg}`} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step content */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Intro step */}
            {currentStep.id === "intro" && (
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30"
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-4xl font-bold tracking-tight">
                  {currentStep.question}
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed max-w-md mx-auto">
                  {currentStep.subtext}
                </p>
                <motion.button
                  onClick={next}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all cursor-pointer flex items-center gap-3 mx-auto"
                >
                  Begin
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {/* Text input steps */}
            {currentStep.type === "text" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {currentStep.question}
                  </h2>
                  {currentStep.subtext && (
                    <p className="text-gray-400 mt-2">{currentStep.subtext}</p>
                  )}
                </div>

                {/* Show the evolving persona */}
                {config.name && currentStep.id !== "name" && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center text-white shadow-lg ${colors.glow}`}>
                      {config.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-gray-500 text-sm">{config.name}</span>
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleTextSubmit(); }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="w-full bg-transparent border-b-2 border-gray-700 focus:border-white text-2xl font-medium py-4 outline-none transition-colors placeholder:text-gray-600"
                  />
                  <div className="flex justify-end mt-6">
                    <button
                      type="submit"
                      disabled={!inputVal.trim()}
                      className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Choice steps */}
            {currentStep.type === "choice" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {currentStep.question}
                  </h2>
                  {currentStep.subtext && (
                    <p className="text-gray-400 mt-2">{currentStep.subtext}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {currentStep.options?.map((opt, i) => (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handleChoice(opt.value)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer group ${
                        config[currentStep.field!] === opt.value
                          ? "border-white bg-white/10"
                          : "border-gray-800 hover:border-gray-600 bg-gray-900/50 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{opt.emoji}</span>
                        <div>
                          <p className="font-bold text-lg">{opt.label}</p>
                          {opt.desc && (
                            <p className="text-sm text-gray-400 mt-0.5">{opt.desc}</p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-select steps */}
            {currentStep.type === "multi" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {currentStep.question}
                  </h2>
                  {currentStep.subtext && (
                    <p className="text-gray-400 mt-2">{currentStep.subtext}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {currentStep.options?.map((opt, i) => {
                    const selected = config.tools.includes(opt.value);
                    return (
                      <motion.button
                        key={opt.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => handleMulti(opt.value)}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          selected
                            ? "border-white bg-white/10 ring-1 ring-white/20"
                            : "border-gray-800 hover:border-gray-600 bg-gray-900/50"
                        }`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <p className="font-bold text-sm mt-2">{opt.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={next}
                    disabled={config.tools.length === 0}
                    className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Birth/reveal step */}
            {currentStep.id === "birth" && (
              <div className="text-center space-y-8">
                {/* The agent avatar — fully formed */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className={`w-32 h-32 bg-gradient-to-br ${colors.bg} rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl ${colors.glow}`}
                >
                  <span className="text-5xl font-bold text-white">
                    {config.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-4xl font-bold">Meet {config.name}</h2>
                  <p className="text-gray-400 mt-2">
                    {config.purpose || "Your new AI assistant"}
                  </p>
                </motion.div>

                {/* Agent's first words */}
                {agentReply && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 bg-gradient-to-br ${colors.bg} rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold`}>
                        {config.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-500 font-semibold mb-1">{config.name}</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{agentReply}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Abilities recap */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {config.tools.map((tool: string) => {
                    const opt = STEPS.find((s) => s.id === "abilities")?.options?.find((o) => o.value === tool);
                    return (
                      <span
                        key={tool}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs font-semibold text-gray-300"
                      >
                        {opt?.emoji} {opt?.label}
                      </span>
                    );
                  })}
                </motion.div>

                {/* Deploy button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  onClick={deploy}
                  disabled={deploying}
                  className={`px-10 py-4 bg-gradient-to-r ${colors.bg} text-white rounded-2xl font-bold text-lg shadow-2xl ${colors.glow} hover:scale-105 transition-all cursor-pointer disabled:opacity-50 mx-auto flex items-center gap-3`}
                >
                  {deploying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Bringing {config.name} to life...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Activate {config.name}
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step counter */}
      {step > 0 && step < STEPS.length - 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? "bg-white w-6"
                  : i < step
                  ? "bg-gray-500"
                  : "bg-gray-800"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
