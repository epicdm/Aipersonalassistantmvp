"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

/* ─── Inline number provisioning (no redirect to /number) ─── */
function InlineProvision({ agentName }: { agentName: string }) {
  const [status, setStatus] = useState<"idle" | "provisioning" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [number, setNumber] = useState("");
  const router = useRouter();

  const handleProvision = async () => {
    setStatus("provisioning");
    setMessage("Finding your number...");
    try {
      const res = await fetch("/api/isola/provision-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: agentName, template: "professional" }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();

      if (data.tenantId) {
        setMessage("Setting up your agent... (30-60 seconds)");
        // Poll for status
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const statusRes = await fetch(`/api/isola/provision-status?tenantId=${data.tenantId}`);
            const statusData = await statusRes.json();
            if (statusData.active) {
              setNumber(statusData.did || data.did || "your new number");
              setStatus("done");
              setMessage("");
              return;
            }
            setMessage(statusData.label || "Setting up...");
          } catch {}
        }
        // Timeout but still success
        setStatus("done");
        setMessage("Your agent is being set up. Check the dashboard in a moment.");
      } else {
        setStatus("done");
        setMessage("Setting up! We'll WhatsApp you when ready.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong");
    }
  };

  if (status === "done") {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="text-emerald-700 font-bold text-lg">
          {number ? `Your number: ${number}` : "Your agent is being set up!"}
        </p>
        <p className="text-[#40484a] text-sm">
          {number
            ? `${agentName} is live! Customers can message this number.`
            : "We'll notify you when it's ready."}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-2 px-6 py-3 bg-[#00333c] text-white rounded-xl font-bold hover:bg-[#004B57] transition-colors cursor-pointer"
        >
          Go to Dashboard →
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
        <p className="text-red-700 font-bold">Setup failed: {message}</p>
        <button onClick={() => { setStatus("idle"); setMessage(""); }}
          className="text-[#40484a] underline cursor-pointer">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left">
        <p className="text-emerald-700 font-bold text-sm mb-1">📱 Get your business WhatsApp number</p>
        <p className="text-[#40484a] text-xs">
          We&apos;ll set up a dedicated Dominica number (+1 767) for {agentName}. Takes about 60 seconds.
        </p>
      </div>
      <button
        onClick={handleProvision}
        disabled={status === "provisioning"}
        className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 cursor-pointer disabled:cursor-wait disabled:hover:scale-100"
      >
        {status === "provisioning" ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {message}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            Get My Number &amp; Activate {agentName}
          </>
        )}
      </button>
    </div>
  );
}
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

// Personal templates use BFF shared number; business templates need own number
const PERSONAL_TEMPLATES = ["assistant", "study-buddy"];
const isPersonalTemplate = (slug: string) => PERSONAL_TEMPLATES.includes(slug);

// ─── Step 0: Template Picker ─────────────────────────────────

function StepTemplatePicker({
  onSelect,
}: {
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="space-y-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h1 className="text-4xl font-extrabold tracking-tight">
          What kind of{" "}
          <span className="bg-gradient-to-r from-[#00333c] to-[#004B57] bg-clip-text text-transparent">
            agent
          </span>{" "}
          do you need?
        </h1>
        <p className="text-[#40484a] text-lg max-w-md mx-auto">
          Pick a template to get started. You can customize everything later.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto"
      >
        {TEMPLATES.map((tpl, i) => (
          <motion.button
            key={tpl.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onSelect(tpl.slug)}
            className={`group relative bg-white/80 border border-[#e1e3e3] rounded-2xl p-5 text-left
              hover:border-[#004B57] hover:bg-white transition-all duration-200
              hover:scale-[1.02] hover:shadow-xl cursor-pointer`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${tpl.color} rounded-xl flex items-center justify-center text-2xl shadow-lg shrink-0`}
              >
                {tpl.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-100 group-hover:text-white transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-xs text-[#40484a] mt-1 leading-relaxed line-clamp-2">
                  {tpl.tagline}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Step 1: Meet Your Agent ──────────────────────────────────

function StepMeetAgent({
  templateSlug,
  agentName,
  onNameChange,
  onContinue,
  onBack,
  creating,
}: {
  templateSlug: string;
  agentName: string;
  onNameChange: (name: string) => void;
  onContinue: () => void;
  onBack: () => void;
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
        <p className="text-sm text-[#40484a] uppercase tracking-wider font-semibold">{tpl.name}</p>
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
              className="bg-gradient-to-r from-[#00333c] to-[#004B57] bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition"
              onClick={handleEditClick}
            >
              {agentName || "your agent"}
            </span>
          )}
        </h1>
        <p className="text-[#40484a] text-lg">{tpl.tagline}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/80 border border-[#e1e3e3] rounded-2xl p-5 max-w-sm mx-auto text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 bg-gradient-to-br ${tpl.color} rounded-lg shrink-0 flex items-center justify-center text-base`}>
            {tpl.emoji}
          </div>
          <div>
            <p className="text-xs text-[#40484a] font-semibold mb-1">{agentName || "Your agent"}</p>
            <p className="text-sm text-[#00333c]/80 leading-relaxed">
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
            className="text-xs text-[#40484a] hover:text-[#40484a] transition cursor-pointer underline underline-offset-2 mb-4 block mx-auto"
          >
            Change name
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-3"
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
        <p className="text-xs text-[#40484a]">
          Your agent will get to know you through conversation — no forms needed!
        </p>
        <button
          onClick={onBack}
          className="text-[#40484a] hover:text-[#40484a] text-xs underline underline-offset-4 transition-colors cursor-pointer"
        >
          ← choose a different template
        </button>
      </motion.div>
    </div>
  );
}

// ─── Step 2: Activate ─────────────────────────────────────────

function StepActivate({
  agentName,
  agentEmoji,
  activationCode,
  templateSlug,
  onContinue,
}: {
  agentName: string;
  agentEmoji: string;
  activationCode: string | null;
  templateSlug: string;
  onContinue: () => void;
}) {
  const isPersonal = isPersonalTemplate(templateSlug);
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
        className={`w-32 h-32 bg-gradient-to-br ${isPersonal ? "from-green-500 to-emerald-600" : "from-blue-500 to-indigo-600"} rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl`}
      >
        <span className="text-5xl">{agentEmoji}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-4xl font-extrabold">
          {agentName} is ready! 🎉
        </h2>
        <p className="text-[#40484a] mt-2 text-lg">
          {isPersonal ? "One tap to activate on WhatsApp" : "Connect your business WhatsApp number"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4 max-w-sm mx-auto"
      >
        {isPersonal ? (
          <>
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
            <p className="text-sm text-[#40484a] mt-2">
              Tap the button, hit send, and your agent will introduce itself ✨
              <br />
              🎤 You can type or send voice notes — your agent understands both!
            </p>
          </>
        ) : (
          <>
            <InlineProvision agentName={agentName} />
            <div className="text-center mt-4">
              <a href="/number" className="text-[#40484a] hover:text-[#00333c] text-sm underline underline-offset-4">
                Or bring your own WhatsApp Business number →
              </a>
            </div>
            {activationCode && (
              <p className="text-xs text-[#40484a] text-center mt-2">
                Your activation code: <span className="font-mono text-[#40484a]">{activationCode}</span>
              </p>
            )}
          </>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <button
          onClick={onContinue}
          className="text-[#40484a] hover:text-[#00333c]/80 text-sm underline underline-offset-4 transition-colors cursor-pointer"
        >
          or continue to dashboard →
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Creation Flow ───────────────────────────────────────

type FlowStep = "template" | "meet" | "activate";

export default function CreationFlow() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("template");
  const [templateSlug, setTemplateSlug] = useState("assistant");
  const [agentName, setAgentName] = useState("Max");
  const [creating, setCreating] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);

  // Read template from sessionStorage — skip to "meet" if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("bff_template");
      if (saved) {
        setTemplateSlug(saved);
        setAgentName(getDefaultName(saved) || "Max");
        setStep("meet");
      }
    }
  }, []);

  const tpl = TEMPLATES.find((t) => t.slug === templateSlug) || TEMPLATES[0];

  const handleTemplateSelect = (slug: string) => {
    setTemplateSlug(slug);
    setAgentName(getDefaultName(slug) || "Max");
    setStep("meet");
  };

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

  const progress =
    step === "template" ? 33 : step === "meet" ? 66 : 100;
  const stepNum =
    step === "template" ? 1 : step === "meet" ? 2 : 3;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{fontFamily:"'Inter',sans-serif",backgroundColor:"#f8f9fa",color:"#191c1d"}}>
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00333c]/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#f2f4f4]/60 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#00333c] to-[#004B57]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* BFF brand */}
      <div className="fixed top-4 left-6 flex items-center gap-2 z-50">
        <div className="w-8 h-8 bg-gradient-to-br from-[#00333c] to-[#004B57] rounded-xl flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-[#40484a]">BFF</span>
      </div>

      {/* Step indicator */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
        <span className="text-xs text-[#40484a] font-medium">
          Step {stepNum} of 3
        </span>
        <Sparkles className="w-3.5 h-3.5 text-[#40484a]" />
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
            {step === "template" && (
              <StepTemplatePicker onSelect={handleTemplateSelect} />
            )}

            {step === "meet" && (
              <StepMeetAgent
                templateSlug={templateSlug}
                agentName={agentName}
                onNameChange={setAgentName}
                onContinue={createAgent}
                onBack={() => setStep("template")}
                creating={creating}
              />
            )}

            {step === "activate" && (
              <StepActivate
                agentName={agentName}
                agentEmoji={tpl.emoji}
                activationCode={activationCode}
                templateSlug={templateSlug}
                onContinue={() => router.push("/dashboard")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
