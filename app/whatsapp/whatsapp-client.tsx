"use client";
import { useState, useEffect } from "react";
import DarkShell from "@/app/components/dark-shell";
import { MessageSquare, CheckCircle, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppClient() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [agentName, setAgentName] = useState("your agent");
  const [savedNumber, setSavedNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent").then(r => r.json()).then(d => {
      if (d.agent?.config?.name) setAgentName(d.agent.config.name);
      if (d.agent?.whatsappNumber) {
        setSavedNumber(d.agent.whatsappNumber);
        setPhoneNumber(d.agent.whatsappNumber);
        setStatus("saved");
      }
    }).catch(() => {});
  }, []);

  const saveNumber = async () => {
    const clean = phoneNumber.trim();
    if (!clean) { toast.error("Enter your WhatsApp number"); return; }
    setStatus("saving");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: clean }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedNumber(clean);
      setStatus("saved");
      toast.success("WhatsApp number saved!");
    } catch (e: any) {
      toast.error(e.message);
      setStatus("idle");
    }
  };

  return (
    <DarkShell title="WhatsApp">
      <div className="max-w-md mx-auto space-y-8 py-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">Let me into your WhatsApp</h2>
          <p className="text-gray-500 text-sm mt-2">I&apos;ll handle messages while you focus on what matters</p>
        </div>

        {(status === "idle" || status === "saving") && (
          <div className="space-y-6">
            <div className="space-y-3">
              {[
                { step: "1", text: "Enter your WhatsApp phone number below" },
                { step: "2", text: `When you deploy ${agentName}, it will connect to WhatsApp` },
                { step: "3", text: "You'll scan a QR code once from the agent's dashboard" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 text-xs font-bold shrink-0">{item.step}</div>
                  <p className="text-sm text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="tel"
                  placeholder="+1 767 295 8382"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500 focus:outline-none text-lg tracking-wider"
                />
              </div>
              <p className="text-xs text-gray-600 text-center">Include country code (e.g. +1 for US/Caribbean)</p>
            </div>

            <button
              onClick={saveNumber}
              disabled={status === "saving"}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "saving" ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <><MessageSquare className="w-5 h-5" /> Save WhatsApp Number</>
              )}
            </button>
          </div>
        )}

        {status === "saved" && (
          <div className="space-y-6">
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-lg font-bold text-green-400">WhatsApp Number Saved</p>
              <p className="text-2xl font-mono text-white">{savedNumber}</p>
              <p className="text-sm text-gray-500">{agentName} will connect to this number when deployed</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                When your agent is live, it runs its own WhatsApp connection — a persistent link that stays online 24/7. You&apos;ll do a one-time QR scan from the agent dashboard to pair it.
              </p>
            </div>

            <button
              onClick={() => { setStatus("idle"); }}
              className="w-full py-3 text-sm text-gray-500 hover:text-white transition-all cursor-pointer"
            >
              Change number
            </button>
          </div>
        )}
      </div>
    </DarkShell>
  );
}
