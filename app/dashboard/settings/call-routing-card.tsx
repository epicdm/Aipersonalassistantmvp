"use client";

import { useState, useEffect } from "react";
import { Phone, Bot, ArrowRight, Save, Loader2, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface CallRoutingConfig {
  enabled: boolean;
  destination: string;       // phone number or SIP URI to forward to
  sipExtension: string;      // PBX extension e.g. "201"
  voiceAgentEnabled: boolean; // route inbound to LiveKit voice agent
  handoffInstructions: string; // context for both text + voice agent
}

const DEFAULT_CONFIG: CallRoutingConfig = {
  enabled: false,
  destination: "",
  sipExtension: "",
  voiceAgentEnabled: true,
  handoffInstructions: "",
};

export default function CallRoutingCard() {
  const [agent, setAgent] = useState<any>(null);
  const [config, setConfig] = useState<CallRoutingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((data) => {
        const a = Array.isArray(data) ? data[0] : data?.agent || data;
        setAgent(a || null);
        if (a?.config?.callRouting) {
          setConfig({ ...DEFAULT_CONFIG, ...a.config.callRouting });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!agent?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          callRouting: config,
          // inboundRouting flag: "voice_agent" if voice enabled, else "whatsapp"
          inboundRouting: config.voiceAgentEnabled ? "voice_agent" : "whatsapp",
        }),
      });
      const data = await res.json();
      if (data.agent) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        toast.success("Call routing saved");
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-[#1A1A1A] rounded w-48 mb-3" />
        <div className="h-4 bg-[#1A1A1A] rounded w-72" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E2725B]/10 rounded-xl">
            <Phone className="w-5 h-5 text-[#E2725B]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">Call Routing</h3>
            <p className="text-xs text-[#A1A1AA]">Create an agent first to configure call routing</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E2725B]/10 rounded-xl">
            <Phone className="w-5 h-5 text-[#E2725B]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">Call Routing</h3>
            <p className="text-xs text-[#A1A1AA]">
              How inbound calls to {agent.name} are handled
            </p>
          </div>
        </div>
        {/* Enable toggle */}
        <button
          onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? "bg-[#E2725B]" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <div className="space-y-4 pt-1">
          {/* Voice Agent Toggle */}
          <div className="flex items-start gap-3 p-4 bg-white/[0.04] border border-white/[0.05] rounded-xl">
            <Bot className="w-5 h-5 text-[#E2725B] mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#FAFAFA]">AI Voice Agent</p>
                <button
                  onClick={() => setConfig((c) => ({ ...c, voiceAgentEnabled: !c.voiceAgentEnabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    config.voiceAgentEnabled ? "bg-[#E2725B]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      config.voiceAgentEnabled ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Route inbound calls to your AI voice agent. Uses the same context and personality as your text agent.
              </p>
            </div>
          </div>

          {/* PBX Extension */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
              PBX Extension{" "}
              <span className="text-white/30 font-normal">(optional — override AI routing)</span>
            </label>
            <input
              type="text"
              value={config.sipExtension}
              onChange={(e) => setConfig((c) => ({ ...c, sipExtension: e.target.value }))}
              placeholder="e.g. 201"
              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E2725B] focus:ring-1 focus:ring-[#E2725B] transition-colors"
            />
            <p className="text-xs text-white/30 mt-1">
              If set, calls will ring this PBX extension after (or instead of) the AI agent.
            </p>
          </div>

          {/* Fallback / Forward-to number */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
              Fallback Phone Number{" "}
              <span className="text-white/30 font-normal">(optional — human handoff)</span>
            </label>
            <input
              type="tel"
              value={config.destination}
              onChange={(e) => setConfig((c) => ({ ...c, destination: e.target.value }))}
              placeholder="e.g. +17675551234"
              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E2725B] focus:ring-1 focus:ring-[#E2725B] transition-colors"
            />
            <p className="text-xs text-white/30 mt-1">
              When the AI can't handle a call, it transfers here.
            </p>
          </div>

          {/* Handoff / Agent Context Instructions */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Agent Instructions{" "}
              <span className="text-white/30 font-normal">(shared by text + voice)</span>
            </label>
            <textarea
              rows={4}
              value={config.handoffInstructions}
              onChange={(e) => setConfig((c) => ({ ...c, handoffInstructions: e.target.value }))}
              placeholder={`e.g. Business hours are Mon–Fri 9am–5pm. Always greet callers by name if known. Transfer to the manager on duty for complaints. Never discuss pricing over the phone.`}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E2725B] focus:ring-1 focus:ring-[#E2725B] transition-colors resize-none"
            />
            <p className="text-xs text-white/30 mt-1">
              These instructions apply to both WhatsApp text conversations and inbound voice calls.
            </p>
          </div>

          {/* Routing summary */}
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA] bg-white/[0.04] rounded-xl px-4 py-3">
            <ArrowRight className="w-3.5 h-3.5 text-[#E2725B] shrink-0" />
            <span>
              Inbound call →{" "}
              {config.voiceAgentEnabled ? (
                <span className="text-[#E2725B] font-medium">AI Voice Agent</span>
              ) : (
                <span className="text-[#A1A1AA]">skips AI voice</span>
              )}
              {config.sipExtension && (
                <> → <span className="text-amber-400 font-medium">ext. {config.sipExtension}</span></>
              )}
              {config.destination && (
                <> → <span className="text-green-400 font-medium">{config.destination}</span></>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#E2725B] hover:bg-[#E2725B] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving..." : saved ? "Saved!" : "Save Call Routing"}
      </button>
    </div>
  );
}
