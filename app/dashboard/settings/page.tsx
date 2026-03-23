"use client";

import { useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import { Settings, MessageCircle, Smartphone, Copy, Check, RefreshCw, XCircle } from "lucide-react";
import DashboardShell from "@/app/components/dashboard-shell";
import { useEffect, useState } from "react";

function WhatsAppConnectionCard() {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((data) => {
        // API returns array or single agent
        const a = Array.isArray(data) ? data[0] : data;
        setAgent(a || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async () => {
    if (!agent?.id) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/activation-code`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.activationCode) {
        setAgent((prev: any) => ({
          ...prev,
          activationCode: data.activationCode,
          ownerPhone: null,
        }));
      }
    } catch {}
    finally { setRegenerating(false); }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-zinc-800 rounded w-48" />
          <div className="h-4 bg-zinc-800 rounded w-72" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">WhatsApp Connection</h3>
            <p className="text-xs text-zinc-500">Create an agent first to connect WhatsApp</p>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = !!agent.ownerPhone;
  const waNumber = "+17672950333";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isConnected ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
            <MessageCircle className={`w-5 h-5 ${isConnected ? "text-green-500" : "text-yellow-500"}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">WhatsApp Connection</h3>
            <p className="text-xs text-zinc-500">
              {isConnected ? "Your WhatsApp is connected to " + agent.name : "Connect your WhatsApp to activate " + agent.name}
            </p>
          </div>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3">
            <Smartphone className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-200 font-mono">
              +{agent.ownerPhone.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "$1 ($2) $3-$4")}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Messages sent to{" "}
            <span className="text-zinc-400 font-medium">{waNumber}</span>{" "}
            from this number are handled by {agent.name}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agent.activationCode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-800/50 rounded-xl p-3 font-mono text-base text-center text-indigo-300 tracking-widest border border-zinc-700">
                  {agent.activationCode}
                </div>
                <button
                  onClick={() => copyCode(agent.activationCode)}
                  className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Text this code to{" "}
                <a
                  href={`https://wa.me/17672950333?text=${encodeURIComponent(agent.activationCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline font-medium"
                >
                  {waNumber}
                </a>{" "}
                on WhatsApp to activate your agent.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                No activation code available. Generate one to connect your WhatsApp.
              </p>
              <button
                onClick={regenerateCode}
                disabled={regenerating}
                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Generating..." : "Generate Activation Code"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardSettingsPage() {
  const { user } = useUser();

  return (
    <DashboardShell>
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account and connections</p>
      </div>

      {/* WhatsApp Connection */}
      <WhatsAppConnectionCard />

      {/* Clerk User Profile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <UserProfile
          appearance={{
            baseTheme: undefined,
            elements: {
              rootBox: "w-full",
              card: "bg-zinc-900 shadow-none border-0 rounded-none",
              navbar: "bg-zinc-900 border-r border-zinc-800",
              navbarButton: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
              navbarButtonActive: "text-indigo-400 bg-indigo-500/10",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput: "bg-zinc-800 border-zinc-700 text-zinc-200",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
              profileSectionTitle: "text-zinc-300",
              profileSectionContent: "text-zinc-400",
              dividerLine: "bg-zinc-800",
              badge: "bg-indigo-500/20 text-indigo-300",
            },
          }}
        />
      </div>
    </div>
    </DashboardShell>
  );
}
