"use client";

import { useState, useEffect } from "react";
import DarkShell from "@/app/components/dark-shell";
import { Save, Bot, Shield, Zap, Check } from "lucide-react";
import { toast } from "sonner";

const TONES = [
  { value: "professional", label: "The Executive", emoji: "🎯" },
  { value: "friendly", label: "The Ally", emoji: "🤝" },
  { value: "casual", label: "The Friend", emoji: "😎" },
  { value: "enthusiastic", label: "The Spark", emoji: "⚡" },
  { value: "empathetic", label: "The Listener", emoji: "💜" },
];

const APPROVAL_MODES = [
  { value: "confirm", label: "Check with me first", emoji: "🔒", desc: "Shows preview before acting" },
  { value: "notify", label: "Act, then tell me", emoji: "📋", desc: "Gets things done, keeps you informed" },
  { value: "auto", label: "Full autonomy", emoji: "🚀", desc: "Handles everything independently" },
];

export default function SettingsClient() {
  const [config, setConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/agent").then((r) => r.json()).then((d) => {
      setConfig(d.agent?.config || {});
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (!loaded) return <DarkShell title="Personality"><div className="text-center py-20 text-[#A1A1AA]">Loading...</div></DarkShell>;

  return (
    <DarkShell title="Personality">
      <div className="space-y-10">
        {/* Identity */}
        <section>
          <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-[#E2725B]" /><h2 className="text-lg font-bold">Identity</h2></div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-[#A1A1AA]">Name</label>
              <input type="text" value={config.name || ""} onChange={(e) => setConfig({ ...config, name: e.target.value })} className="w-full mt-1 px-4 py-3 bg-[#111111] border border-white/[0.07] rounded-xl focus:ring-2 focus:ring-[#E2725B] outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-bold text-[#A1A1AA]">Purpose</label>
              <textarea value={config.purpose || ""} onChange={(e) => setConfig({ ...config, purpose: e.target.value })} rows={2} className="w-full mt-1 px-4 py-3 bg-[#111111] border border-white/[0.07] rounded-xl focus:ring-2 focus:ring-[#E2725B] outline-none text-sm resize-none" />
            </div>
          </div>
        </section>

        {/* Personality */}
        <section>
          <div className="flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-[#D4A373]" /><h2 className="text-lg font-bold">Personality</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setConfig({ ...config, tone: t.value })}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${config.tone === t.value ? "border-indigo-500 bg-[#E2725B]/100/10" : "border-white/[0.07] bg-[#111111] hover:border-white/10"}`}
              >
                <span className="text-xl">{t.emoji}</span>
                <p className="text-xs font-bold mt-1">{t.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section>
          <div className="flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-amber-400" /><h2 className="text-lg font-bold">Trust Level</h2></div>
          <div className="space-y-2">
            {APPROVAL_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setConfig({ ...config, approvalMode: m.value })}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${config.approvalMode === m.value ? "border-indigo-500 bg-[#E2725B]/100/10" : "border-white/[0.07] bg-[#111111] hover:border-white/10"}`}
              >
                <span className="text-xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">{m.label}</p>
                  <p className="text-xs text-[#A1A1AA]">{m.desc}</p>
                </div>
                {config.approvalMode === m.value && <Check className="w-4 h-4 text-[#E2725B]" />}
              </button>
            ))}
          </div>
        </section>

        {/* Save */}
        <button onClick={save} disabled={saving} className="px-8 py-3 rounded-xl bg-[#E2725B] text-white font-bold hover:bg-[#F48B76] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </DarkShell>
  );
}
