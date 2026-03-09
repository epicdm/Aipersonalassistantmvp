"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Check,
  X,
  Plus,
  Loader2,
  Building2,
  Phone,
  MapPin,
  Clock,
  Tags,
  Zap,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES, AgentTemplate } from "@/app/lib/templates";

// ─── Types ───────────────────────────────────────────────────

type BusinessHours = {
  [day: string]: { open: string | null; close: string | null; closed: boolean };
};

type BusinessInfo = {
  name: string;
  industry: string;
  description: string;
  phone: string | null;
  location: string | null;
  hours: BusinessHours | null;
  services: string[];
  email: string | null;
  website: string;
};

type Recommendation = {
  slug: string;
  reason: string;
  template: AgentTemplate;
};

type OnboardingState = {
  // Step 1: URL
  url: string;
  // Step 2: Business info
  business: BusinessInfo | null;
  // Step 3: Selected templates
  selectedTemplates: string[];
  // Step 4: Agent names (mapped by template slug)
  agentNames: Record<string, string>;
  // Step 5: Trust level
  approvalMode: string;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const PERSONA_COLORS: Record<string, { bg: string; glow: string }> = {
  professional: { bg: "from-blue-500 to-cyan-500", glow: "shadow-blue-500/30" },
  friendly: { bg: "from-amber-500 to-orange-500", glow: "shadow-amber-500/30" },
  casual: { bg: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/30" },
  enthusiastic: { bg: "from-violet-500 to-fuchsia-500", glow: "shadow-violet-500/30" },
  empathetic: { bg: "from-rose-500 to-pink-500", glow: "shadow-rose-500/30" },
};

// ─── Step 1: URL Input ────────────────────────────────────────

function StepUrl({
  value,
  onChange,
  onNext,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleScan = async () => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      // Trigger parent which calls the scan API
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30"
        >
          <Globe className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold tracking-tight"
        >
          What&apos;s your website?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 text-lg max-w-sm mx-auto"
        >
          We&apos;ll scan it and set up your AI in seconds. Works with websites, Facebook pages, and Google Business profiles.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
        >
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="yourwebsite.com or facebook.com/yourbusiness"
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={!value.trim() || loading}
            className="w-full mt-3 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                Scan My Business
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-gray-600 hover:text-gray-400 transition-colors py-2 cursor-pointer"
        >
          I don&apos;t have a website → set up manually
        </button>
      </motion.div>
    </div>
  );
}

// ─── Step 2: Business Review ──────────────────────────────────

function StepReview({
  business,
  onUpdate,
  onNext,
  onBack,
}: {
  business: BusinessInfo;
  onUpdate: (b: BusinessInfo) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<BusinessInfo>({ ...business });
  const [newService, setNewService] = useState("");

  const updateHours = (day: string, field: string, val: string | boolean) => {
    setEditing((prev) => ({
      ...prev,
      hours: {
        ...(prev.hours || {}),
        [day]: {
          ...(prev.hours?.[day] || { open: "09:00", close: "17:00", closed: false }),
          [field]: val,
        },
      },
    }));
  };

  const addService = () => {
    if (!newService.trim()) return;
    setEditing((prev) => ({ ...prev, services: [...prev.services, newService.trim()] }));
    setNewService("");
  };

  const removeService = (i: number) => {
    setEditing((prev) => ({
      ...prev,
      services: prev.services.filter((_, idx) => idx !== i),
    }));
  };

  const handleNext = () => {
    onUpdate(editing);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Here&apos;s what we found</h2>
        <p className="text-gray-400 mt-1">Review and edit — we&apos;ll use this to configure your agent.</p>
      </div>

      {/* Business name + industry */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
          <Building2 className="w-3.5 h-3.5" />
          Business Info
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Business Name</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Industry</label>
            <input
              value={editing.industry}
              onChange={(e) => setEditing({ ...editing, industry: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 mb-1">
              <Phone className="w-3 h-3" /> Phone
            </label>
            <input
              value={editing.phone || ""}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value || null })}
              placeholder="Not found"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <input
              value={editing.location || ""}
              onChange={(e) => setEditing({ ...editing, location: e.target.value || null })}
              placeholder="Not found"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
          <Tags className="w-3.5 h-3.5" />
          Services
        </div>
        <div className="flex flex-wrap gap-2">
          {editing.services.map((s, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm"
            >
              {s}
              <button
                onClick={() => removeService(i)}
                className="text-gray-500 hover:text-red-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addService()}
            placeholder="Add a service..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <button
            onClick={addService}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Business hours */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Business Hours
        </div>
        <div className="space-y-2">
          {DAYS.map((day) => {
            const h = editing.hours?.[day] || { open: "09:00", close: "17:00", closed: false };
            return (
              <div key={day} className="flex items-center gap-3">
                <span className="w-10 text-xs text-gray-500 font-medium">{DAY_LABELS[day]}</span>
                <button
                  onClick={() => updateHours(day, "closed", !h.closed)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    !h.closed ? "bg-indigo-500" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      !h.closed ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                {!h.closed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={h.open || "09:00"}
                      onChange={(e) => updateHours(day, "open", e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-gray-500 flex-1"
                    />
                    <span className="text-gray-600 text-xs">to</span>
                    <input
                      type="time"
                      value={h.close || "17:00"}
                      onChange={(e) => updateHours(day, "close", e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-gray-500 flex-1"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-600">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition cursor-pointer text-sm font-medium"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer flex items-center justify-center gap-2"
        >
          Looks good
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Agent Recommendations ───────────────────────────

function StepRecommend({
  business,
  recommendations,
  selected,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: {
  business: BusinessInfo;
  recommendations: Recommendation[];
  selected: string[];
  onToggle: (slug: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          We recommend these agents
        </h2>
        <p className="text-gray-400 mt-1">
          Based on your {business.industry} business. Pick one to start, or add all — you can always change later.
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const tpl = rec.template;
          if (!tpl) return null;
          const isSelected = selected.includes(rec.slug);
          return (
            <motion.button
              key={rec.slug}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onToggle(rec.slug)}
              className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-gray-800 hover:border-gray-600 bg-gray-900/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-2xl shrink-0`}
                >
                  {tpl.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{tpl.name}</p>
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{rec.reason}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Manual pick option */}
      <details className="group">
        <summary className="text-sm text-gray-500 hover:text-gray-300 cursor-pointer transition-colors">
          Or pick a different template
        </summary>
        <div className="mt-3 space-y-2">
          {TEMPLATES.filter((t) => !recommendations.some((r) => r.slug === t.slug)).map((tpl) => (
            <button
              key={tpl.slug}
              onClick={() => onToggle(tpl.slug)}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                selected.includes(tpl.slug)
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-gray-800 bg-gray-900/30 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{tpl.emoji}</span>
                <div>
                  <p className="font-medium text-sm">{tpl.name}</p>
                  <p className="text-xs text-gray-500">{tpl.tagline}</p>
                </div>
                {selected.includes(tpl.slug) && (
                  <Check className="w-4 h-4 text-indigo-400 ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      </details>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition cursor-pointer text-sm font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
        >
          Set up {selected.length > 1 ? `${selected.length} agents` : "this agent"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={onSkip}
        className="w-full text-center text-xs text-gray-600 hover:text-gray-400 cursor-pointer"
      >
        Skip recommendations — I&apos;ll set up manually
      </button>
    </div>
  );
}

// ─── Step 4: Agent Name ───────────────────────────────────────

function StepName({
  templateSlug,
  templateName,
  value,
  onChange,
  onNext,
  onBack,
  isLastTemplate,
}: {
  templateSlug: string;
  templateName: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  isLastTemplate: boolean;
}) {
  const tpl = TEMPLATES.find((t) => t.slug === templateSlug);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  return (
    <div className="space-y-6">
      {tpl && (
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-3xl`}
        >
          {tpl.emoji}
        </div>
      )}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Name your {templateName}</h2>
        <p className="text-gray-400 mt-1">
          This is how your {templateName} will introduce itself.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onNext();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Luna, Max, Aria, Jade..."
          className="w-full bg-transparent border-b-2 border-gray-700 focus:border-white text-3xl font-bold py-3 outline-none transition-colors placeholder:text-gray-700"
        />
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition cursor-pointer text-sm font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLastTemplate ? "Continue" : "Next Agent"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Step 5: Trust Level ──────────────────────────────────────

function StepTrust({
  agentName,
  value,
  onChange,
  onNext,
  onBack,
}: {
  agentName: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options = [
    { value: "confirm", label: "Check with me first", emoji: "🔒", desc: "Shows you what they'll do before doing it" },
    { value: "notify", label: "Act, then tell me", emoji: "📋", desc: "Gets things done, keeps you in the loop" },
    { value: "auto", label: "Full autonomy", emoji: "🚀", desc: "Handles everything independently" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">How much freedom does {agentName} get?</h2>
        <p className="text-gray-400 mt-1">You can always change this later.</p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
              value === opt.value
                ? "border-white bg-white/10"
                : "border-gray-800 hover:border-gray-600 bg-gray-900/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-bold">{opt.label}</p>
                <p className="text-sm text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
              {value === opt.value && (
                <Check className="w-5 h-5 text-white ml-auto" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition cursor-pointer text-sm font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer flex items-center justify-center gap-2"
        >
          Activate {agentName}
          <Zap className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Manual Template Picker (fallback) ────────────────────────

function StepManualTemplate({
  selected,
  onToggle,
  onNext,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">What kind of agent do you need?</h2>
        <p className="text-gray-400 mt-1">Pick a template to get started. You can customize everything after.</p>
      </div>
      <div className="space-y-3">
        {TEMPLATES.map((tpl, i) => (
          <motion.button
            key={tpl.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => onToggle(tpl.slug)}
            className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
              selected.includes(tpl.slug)
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-gray-800 hover:border-gray-600 bg-gray-900/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-2xl shrink-0`}>
                {tpl.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{tpl.name}</p>
                  {selected.includes(tpl.slug) && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{tpl.tagline}</p>
                <p className="text-xs text-gray-600 mt-1">{tpl.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={selected.length === 0}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-40 cursor-pointer"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Birth Screen ─────────────────────────────────────────────

function StepBirth({
  agentName,
  templateSlug,
  deploying,
  onDeploy,
}: {
  agentName: string;
  templateSlug: string;
  deploying: boolean;
  onDeploy: () => void;
}) {
  const tpl = TEMPLATES.find((t) => t.slug === templateSlug);
  const colors = tpl ? tpl.color : "from-indigo-500 to-violet-600";

  const responses: Record<string, string> = {
    professional: `${agentName} here. I'm ready to handle things. What's first?`,
    friendly: `Hey! I'm ${agentName} 👋 So excited to get started — what can I help with?`,
    casual: `Yo, ${agentName} here. Ready when you are.`,
    enthusiastic: `I'm ${agentName}!! ⚡ Let's DO this!`,
    empathetic: `Hi there. I'm ${agentName}. I'm here to listen and help. What do you need?`,
  };

  const reply = tpl ? (responses[tpl.tone] || responses.professional) : `Hi, I'm ${agentName}. Ready to help!`;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!deploying) onDeploy();
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className={`w-32 h-32 bg-gradient-to-br ${colors} rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl`}
      >
        <span className="text-5xl">{tpl?.emoji || "✨"}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-4xl font-extrabold">Meet {agentName}</h2>
        <p className="text-gray-400 mt-2">{tpl?.tagline || "Your AI assistant"}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto"
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 bg-gradient-to-br ${colors} rounded-lg shrink-0 flex items-center justify-center text-lg`}>
            {tpl?.emoji || "🤖"}
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500 font-semibold mb-1">{agentName}</p>
            <p className="text-sm text-gray-300 leading-relaxed">{reply}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        {deploying ? (
          <div className="flex items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Setting up {agentName}...
          </div>
        ) : (
          <button
            onClick={onDeploy}
            className={`px-10 py-4 bg-gradient-to-r ${colors} text-white rounded-2xl font-bold text-lg shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center gap-3 mx-auto`}
          >
            <Zap className="w-5 h-5" />
            Activate {agentName}
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ─── Activate Screen ─────────────────────────────────────────

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
  const waNumber = "17672851568";
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

type FlowStep =
  | "url"
  | "scanning"
  | "review"
  | "recommend"
  | "manual-template"
  | "name"
  | "trust"
  | "birth"
  | "activate";

export default function CreationFlow() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("url");
  const [state, setState] = useState<OnboardingState>({
    url: "",
    business: null,
    selectedTemplates: [],
    agentNames: {},
    approvalMode: "notify",
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [currentTemplateIdx, setCurrentTemplateIdx] = useState(0);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [firstAgentName, setFirstAgentName] = useState<string>("your agent");
  const [firstAgentEmoji, setFirstAgentEmoji] = useState<string>("✨");

  const currentTemplate = state.selectedTemplates[currentTemplateIdx] || TEMPLATES[0].slug;
  const currentTemplateName = TEMPLATES.find(t => t.slug === currentTemplate)?.name || "Agent";

  // Check if landing page already scanned a business
  useEffect(() => {
    if (typeof window !== "undefined") {
      // If user clicked "sign up without a website", skip straight to template selection
      const skipScan = sessionStorage.getItem("bff_skip_scan");
      if (skipScan) {
        sessionStorage.removeItem("bff_skip_scan");
        setStep("manual-template");
        return;
      }

      const savedBusiness = sessionStorage.getItem("bff_business");
      const savedUrl = sessionStorage.getItem("bff_scan_url");
      if (savedBusiness) {
        try {
          const business = JSON.parse(savedBusiness);
          setState((prev) => ({
            ...prev,
            business,
            url: savedUrl || "",
          }));
          // Clear it so it doesn't persist
          sessionStorage.removeItem("bff_business");
          sessionStorage.removeItem("bff_scan_url");
          
          // Get recommendations first, then skip to review
          fetch("/api/business/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(business),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                setRecommendations(data.recommendations);
                // If we have recommendations, skip straight to review
                // The user can then go to recommendations or manual template selection
                setStep("review");
              } else {
                // If no recommendations, go to manual template selection
                setStep("manual-template");
              }
            })
            .catch(() => {
              // On error, still go to review
              setStep("review");
            });
        } catch {
          // Invalid data, start fresh
        }
      }
    }
  }, []);

  const scanBusiness = useCallback(async () => {
    setStep("scanning");
    setScanError(null);
    try {
      const res = await fetch("/api/business/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.url }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setState((prev) => ({ ...prev, business: data.data }));

        // Get recommendations
        try {
          const recRes = await fetch("/api/business/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.data),
          });
          const recData = await recRes.json();
          if (recData.success) {
            setRecommendations(recData.recommendations);
          }
        } catch {
          // Skip recommendations if it fails
        }

        setStep("review");
      } else {
        throw new Error(data.error || "Scan failed");
      }
    } catch (err: any) {
      setScanError(err.message);
      toast.error("Couldn't scan that URL — you can set up manually");
      setStep("url");
    }
  }, [state.url]);

  useEffect(() => {
    if (step === "scanning") {
      scanBusiness();
    }
  }, [step, scanBusiness]);

  const deployAgents = async () => {
    setDeploying(true);
    try {
      const templatesToCreate = state.selectedTemplates.length > 0
        ? state.selectedTemplates
        : [currentTemplate];

      let firstCode: string | null = null;
      let firstSlug = templatesToCreate[0];

      for (const slug of templatesToCreate) {
        const tpl = TEMPLATES.find((t) => t.slug === slug)!;
        // Get the name for this specific template from agentNames mapping
        // Fallback to template name if not specified
        const agentName = state.agentNames[slug] || tpl.name;

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agentName,
            template: slug,
            purpose: tpl.purpose,
            tools: tpl.tools,
            config: {
              name: agentName,
              template: slug,
              purpose: tpl.purpose,
              tone: tpl.tone,
              tools: tpl.tools,
              approvalMode: state.approvalMode,
              business: state.business,
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
        // Capture the first agent's activation code
        if (!firstCode && data.agent?.activationCode) {
          firstCode = data.agent.activationCode;
          firstSlug = slug;
        }
      }

      const firstName = Object.values(state.agentNames)[0] || TEMPLATES.find(t => t.slug === firstSlug)?.name || "your agent";
      const firstEmoji = TEMPLATES.find(t => t.slug === firstSlug)?.emoji || "✨";

      setActivationCode(firstCode);
      setFirstAgentName(firstName);
      setFirstAgentEmoji(firstEmoji);
      setDeploying(false);
      setStep("activate");
    } catch {
      toast.error("Something went wrong");
      setDeploying(false);
    }
  };

  const progress = {
    url: 10,
    scanning: 25,
    review: 40,
    recommend: 55,
    "manual-template": 55,
    name: 72,
    trust: 88,
    birth: 100,
    activate: 100,
  }[step] || 10;

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
            {/* Scanning loader */}
            {step === "scanning" && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl mx-auto flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
                <h2 className="text-3xl font-bold">Scanning your business...</h2>
                <p className="text-gray-400">We&apos;re reading your website and figuring out the best setup for you.</p>
              </div>
            )}

            {step === "url" && (
              <StepUrl
                value={state.url}
                onChange={(url) => setState((p) => ({ ...p, url }))}
                onNext={() => setStep("scanning")}
                onSkip={() => setStep("manual-template")}
              />
            )}

            {step === "review" && state.business && (
              <StepReview
                business={state.business}
                onUpdate={(business) => setState((p) => ({ ...p, business }))}
                onNext={() => setStep(recommendations.length > 0 ? "recommend" : "manual-template")}
                onBack={() => setStep("url")}
              />
            )}

            {step === "recommend" && state.business && (
              <StepRecommend
                business={state.business}
                recommendations={recommendations}
                selected={state.selectedTemplates}
                onToggle={(slug) => {
                  setState((p) => ({
                    ...p,
                    selectedTemplates: p.selectedTemplates.includes(slug)
                      ? p.selectedTemplates.filter((s) => s !== slug)
                      : [...p.selectedTemplates, slug],
                  }));
                }}
                onNext={() => {
                  setCurrentTemplateIdx(0);
                  setStep("name");
                }}
                onBack={() => setStep("review")}
                onSkip={() => setStep("manual-template")}
              />
            )}

            {step === "manual-template" && (
              <StepManualTemplate
                selected={state.selectedTemplates}
                onToggle={(slug) => {
                  setState((p) => ({
                    ...p,
                    selectedTemplates: p.selectedTemplates.includes(slug)
                      ? p.selectedTemplates.filter((s) => s !== slug)
                      : [...p.selectedTemplates, slug],
                  }));
                }}
                onNext={() => {
                  setCurrentTemplateIdx(0);
                  setStep("name");
                }}
              />
            )}

            {step === "name" && (
              <StepName
                templateSlug={currentTemplate}
                templateName={currentTemplateName}
                value={state.agentNames[currentTemplate] || ""}
                onChange={(name) => setState((p) => ({ 
                  ...p, 
                  agentNames: { ...p.agentNames, [currentTemplate]: name } 
                }))}
                onNext={() => {
                  if (currentTemplateIdx < state.selectedTemplates.length - 1) {
                    // Move to next template for naming
                    setCurrentTemplateIdx(currentTemplateIdx + 1);
                  } else {
                    // All templates named, move to trust step
                    setStep("trust");
                  }
                }}
                onBack={() => {
                  if (currentTemplateIdx > 0) {
                    // Go back to previous template
                    setCurrentTemplateIdx(currentTemplateIdx - 1);
                  } else {
                    // Go back to template selection
                    setStep(
                      recommendations.length > 0 ? "recommend" : "manual-template"
                    );
                  }
                }}
                isLastTemplate={currentTemplateIdx === state.selectedTemplates.length - 1}
              />
            )}

            {step === "trust" && (
              <StepTrust
                agentName={state.selectedTemplates.length > 1 ? "your agents" : Object.values(state.agentNames)[0] || "your agent"}
                value={state.approvalMode}
                onChange={(approvalMode) => setState((p) => ({ ...p, approvalMode }))}
                onNext={() => setStep("birth")}
                onBack={() => {
                  setCurrentTemplateIdx(state.selectedTemplates.length - 1);
                  setStep("name");
                }}
              />
            )}

            {step === "birth" && (
              <StepBirth
                agentName={state.selectedTemplates.length > 1 ? "your agents" : Object.values(state.agentNames)[0] || "your agent"}
                templateSlug={currentTemplate}
                deploying={deploying}
                onDeploy={deployAgents}
              />
            )}

            {step === "activate" && (
              <StepActivate
                agentName={firstAgentName}
                agentEmoji={firstAgentEmoji}
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
