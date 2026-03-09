"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Loader2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/app/lib/templates";

// ─── Default agent names per template ────────────────────────

const DEFAULT_NAMES: Record<string, string> = {
  assistant: "Max",
  "study-buddy": "Luna",
  receptionist: "Alex",
  concierge: "Rio",
  collector: "Chase",
  sales: "Vera",
  support: "Sam",
};

function getDefaultName(slug: string): string {
  return DEFAULT_NAMES[slug] || "";
}

// ─── Step 1: Meet Your Agent ──────────────────────────────────

function StepMeetAgent({
  templateSlug,
  agentName,
  onNameChange,
  onContinue,
  creating,
}: {
  templateSlug: string;
  agentName: string;
  onNameChange: (name: string) => void;
  onContinue: () => void;
  creating: boolean;
}) {
  const tpl = TEMPLATES.find((t) => t.slug === templateSlug) || TEMPLATES[0];
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEditClick = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className={`w-28 h-28 bg-gradient-to-br ${tpl.color} rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl`}
      >
        <span className="text-5xl">{tpl.emoji}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">{tpl.name}</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Meet{" "}
          {editing ? (
            <input
              ref={inputRef}
              value={agentName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              className="bg-transparent border-b-2 border-indigo-400 focus:outline-none text-4xl font-extrabold w-36 text-center"
              placeholder="Name..."
            />
          ) : (
            <span
              className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition"
              onClick={handleEditClick}
            >
              {agentName || "your agent"}
            </span>
          )}
        </h1>
        <p className="text-gray-400 text-lg">{tpl.tagline}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 max-w-sm mx-auto text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 bg-gradient-to-br ${tpl.color} rounded-lg shrink-0 flex items-center justify-center text-base`}>
            {tpl.emoji}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">{agentName || "Your agent"}</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Hey! I&apos;m {agentName || "here"} 👋 I&apos;ll get to know you through conversation — no forms needed. Ready when you are!
            </p>
          </div>
        </div>
      </motion.div>

      {!editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={handleEditClick}
            className="text-xs text-gray-600 hover:text-gray-400 transition cursor-pointer underline underline-offset-2 mb-4 block mx-auto"
          >
            Change name
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={onContinue}
          disabled={creating || !agentName.trim()}
          className={`px-10 py-4 bg-gradient-to-r ${tpl.color} text-white rounded-2xl font-bold text-lg shadow-2xl hover:scale-105 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 mx-auto`}
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up {agentName}...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Activate {agentName}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        <p className="text-xs text-gray-600 mt-3">
          Your agent will get to know you through conversation — no forms needed!
        </p>
      </motion.div>
    </div>
  );
}

// ─── Step 2: WhatsApp Activation ─────────────────────────────

function StepActivate({
  agentName,
  agentEmoji,
  activationCode,
  onContinue,
}: {
  agentName: string;
  agentEmoji: string;
  activationCode: string | null;
  onContinue: () => void;
}) {
  const waNumber = "17672950333";
  const waText = activationCode
    ? `Hey! I just created my BFF agent — activate me! 🚀 ${activationCode}`
    : "Hey! I want to set up my BFF agent";
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl"
      >
        <span className="text-5xl">{agentEmoji}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-4xl font-extrabold">
          {agentName} is ready! 🎉
        </h2>
        <p className="text-gray-400 mt-2 text-lg">
          One tap to activate on WhatsApp
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4 max-w-sm mx-auto"
      >
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl font-bold text-xl shadow-2xl shadow-green-500/30 transition-all hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Start chatting on WhatsApp
        </a>

        <p className="text-sm text-gray-500 mt-2">
          Tap the button, hit send, and your agent will introduce itself ✨
          <br />
          🎤 You can type or send voice notes — your agent understands both!
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <button
          onClick={onContinue}
          className="text-gray-500 hover:text-gray-300 text-sm underline underline-offset-4 transition-colors cursor-pointer"
        >
          or continue to dashboard →
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Creation Flow ───────────────────────────────────────

type FlowStep = "meet" | "activate";

export default function CreationFlow() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("meet");
  const [templateSlug, setTemplateSlug] = useState("assistant");
  const [agentName, setAgentName] = useState("Max");
  const [creating, setCreating] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);

  // Read template from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("bff_template");
      if (saved) {
        setTemplateSlug(saved);
        setAgentName(getDefaultName(saved) || "Max");
        // Keep it in storage until agent is created, then clear
      }
    }
  }, []);

  const tpl = TEMPLATES.find((t) => t.slug === templateSlug) || TEMPLATES[0];

  const createAgent = async () => {
    if (!agentName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          template: tpl.slug,
          purpose: tpl.purpose,
          tools: tpl.tools,
          config: {
            name: agentName.trim(),
            template: tpl.slug,
            purpose: tpl.purpose,
            tone: tpl.tone,
            tools: tpl.tools,
            approvalMode: tpl.approvalMode,
            business: null,
            setupComplete: false,
          },
          guardrails: {
            maxPrice: null,
            escalateOn: [],
            quietHours: null,
            neverDiscuss: [],
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      if (data.agent?.activationCode) {
        setActivationCode(data.agent.activationCode);
      }

      // Clear sessionStorage template
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("bff_template");
      }

      setStep("activate");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const progress = step === "meet" ? 50 : 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800/60 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* BFF brand */}
      <div className="fixed top-4 left-6 flex items-center gap-2 z-50">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-gray-400">BFF</span>
      </div>

      {/* Step indicator */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
        <span className="text-xs text-gray-600 font-medium">
          Step {step === "meet" ? "1" : "2"} of 2
        </span>
        <Sparkles className="w-3.5 h-3.5 text-gray-600" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35 }}
          >
            {step === "meet" && (
              <StepMeetAgent
                templateSlug={templateSlug}
                agentName={agentName}
                onNameChange={setAgentName}
                onContinue={createAgent}
                creating={creating}
              />
            )}

            {step === "activate" && (
              <StepActivate
                agentName={agentName}
                agentEmoji={tpl.emoji}
                activationCode={activationCode}
                onContinue={() => router.push("/dashboard")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
