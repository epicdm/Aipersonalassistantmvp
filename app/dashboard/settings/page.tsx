"use client";

import { useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import { Settings, MessageCircle, Smartphone, Copy, Check, RefreshCw, XCircle } from "lucide-react";
import DashboardShell from "@/app/components/dashboard-shell";
import { useEffect, useState } from "react";
import CallRoutingCard from "./call-routing-card";

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
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[#1A1A1A] rounded w-48" />
          <div className="h-4 bg-[#1A1A1A] rounded w-72" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">WhatsApp Connection</h3>
            <p className="text-xs text-[#A1A1AA]">Create an agent first to connect WhatsApp</p>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = !!agent.ownerPhone;
  const waNumber = "+17672950333";

  return (
    <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isConnected ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
            <MessageCircle className={`w-5 h-5 ${isConnected ? "text-green-500" : "text-yellow-500"}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">WhatsApp Connection</h3>
            <p className="text-xs text-[#A1A1AA]">
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
          <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3">
            <Smartphone className="w-4 h-4 text-[#A1A1AA]" />
            <span className="text-sm text-[#FAFAFA] font-mono">
              +{agent.ownerPhone.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "$1 ($2) $3-$4")}
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Messages sent to{" "}
            <span className="text-[#A1A1AA] font-medium">{waNumber}</span>{" "}
            from this number are handled by {agent.name}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agent.activationCode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/[0.04] rounded-xl p-3 font-mono text-base text-center text-[#E2725B] tracking-widest border border-white/10">
                  {agent.activationCode}
                </div>
                <button
                  onClick={() => copyCode(agent.activationCode)}
                  className="p-3 rounded-xl bg-[#1A1A1A] hover:bg-white/10 transition-colors text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#A1A1AA]">
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
              <p className="text-xs text-[#A1A1AA]">
                No activation code available. Generate one to connect your WhatsApp.
              </p>
              <button
                onClick={regenerateCode}
                disabled={regenerating}
                className="flex items-center gap-2 text-xs text-[#E2725B] hover:text-[#E2725B] transition-colors disabled:opacity-50"
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
        <h1 className="text-xl font-bold text-[#FAFAFA]">Settings</h1>
        <p className="text-sm text-[#A1A1AA] mt-0.5">Manage your account and connections</p>
      </div>

      {/* WhatsApp Connection */}
      <WhatsAppConnectionCard />

      {/* Call Routing */}
      <CallRoutingCard />

      {/* Clerk User Profile */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
        <UserProfile
          appearance={{
            baseTheme: undefined,
            elements: {
              rootBox: "w-full",
              card: "bg-[#111111] shadow-none border-0 rounded-none",
              navbar: "bg-[#111111] border-r border-white/[0.07]",
              navbarButton: "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]",
              navbarButtonActive: "text-[#E2725B] bg-[#E2725B]/10",
              headerTitle: "text-[#FAFAFA]",
              headerSubtitle: "text-[#A1A1AA]",
              formFieldLabel: "text-[#FAFAFA]/80",
              formFieldInput: "bg-[#1A1A1A] border-white/10 text-[#FAFAFA]",
              formButtonPrimary: "bg-[#E2725B] hover:bg-[#D4A373]",
              profileSectionTitle: "text-[#FAFAFA]/80",
              profileSectionContent: "text-[#A1A1AA]",
              dividerLine: "bg-[#1A1A1A]",
              badge: "bg-[#E2725B]/15 text-[#E2725B]",
            },
          }}
        />
      </div>
    </div>
    </DashboardShell>
  );
}
