"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/app/components/dashboard-shell";
import { Bot, Plus, Settings, MessageCircle, Phone } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  template?: string;
  status: string;
  whatsappNumber?: string;
  didNumber?: string;
  updatedAt?: string;
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const TEMPLATE_COLORS: Record<string, string> = {
  receptionist: "bg-[#E2725B]/15 text-[#E2725B] border border-[#E2725B]/20",
  concierge: "bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/20",
  collections: "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  sales: "bg-green-500/20 text-green-300 border border-green-500/20",
  support: "bg-blue-500/20 text-blue-300 border border-blue-500/20",
};

const GRADIENT_PAIRS = [
  "from-[#E2725B] to-[#D4A373]",
  "from-[#D4A373] to-[#E2725B]",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent?all=true")
      .then((r) => r.json())
      .then((data) => {
        setAgents(Array.isArray(data) ? data : (data.agents || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Agents</h1>
          <p className="text-sm text-[#A1A1AA] mt-0.5">Manage your AI assistants</p>
        </div>
        <Link href="/create" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#E2725B] to-[#D4A373] hover:from-[#F48B76] hover:to-[#D4A373] text-white shadow-lg shadow-[#E2725B]/20 transition-all">
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 animate-pulse h-52" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[#111111] border border-white/[0.07] border-dashed rounded-2xl p-16 text-center">
          <Bot className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <p className="text-base font-semibold text-[#A1A1AA]">No agents yet</p>
          <p className="text-sm text-white/30 mt-1 mb-6">Create your first AI agent in minutes</p>
          <Link href="/create" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#E2725B] to-[#D4A373] text-white transition-all">Create your first agent</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
            return (
              <div key={agent.id} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-all group">
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {getInitials(agent.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#FAFAFA]">{agent.name}</p>
                      {agent.template && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${TEMPLATE_COLORS[agent.template] || "bg-white/10 text-[#A1A1AA]"}`}>
                          {agent.template}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Status dot */}
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${agent.status === "active" ? "bg-green-500/10 text-green-400" : "bg-[#1A1A1A] text-[#A1A1AA]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-green-400 animate-pulse" : "bg-white/15"}`} />
                    {agent.status === "active" ? "Active" : "Draft"}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {agent.whatsappNumber ? (
                    <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                      <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                      <span>{agent.whatsappNumber}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp not connected</span>
                    </div>
                  )}
                  {agent.didNumber ? (
                    <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                      <Phone className="w-3.5 h-3.5 text-[#E2725B]" />
                      <span className="font-mono">{agent.didNumber}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <Phone className="w-3.5 h-3.5" />
                      <span>No phone number</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-white/[0.07]">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#E2725B]/10 hover:bg-[#E2725B]/15 text-[#E2725B] border border-[#E2725B]/20 hover:border-[#E2725B]/40 transition-all">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Open
                  </Link>
                  <Link href={`/settings?agent=${agent.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA]/80 hover:bg-[#1A1A1A] transition-all">
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Add more card */}
          <Link href="/create" className="bg-[#111111] border border-white/[0.07] border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-white/15 hover:bg-[#111111]/80 transition-all group cursor-pointer min-h-[200px]">
            <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] group-hover:bg-white/10 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
            </div>
            <p className="text-sm text-[#A1A1AA] group-hover:text-[#FAFAFA]/80 transition-colors font-medium">Add Agent</p>
          </Link>
        </div>
      )}
    </div>
    </DashboardShell>
  );
}