"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  receptionist: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20",
  concierge: "bg-violet-500/20 text-violet-300 border border-violet-500/20",
  collections: "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  sales: "bg-green-500/20 text-green-300 border border-green-500/20",
  support: "bg-blue-500/20 text-blue-300 border border-blue-500/20",
};

const GRADIENT_PAIRS = [
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((data) => {
        setAgents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Agents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your AI assistants</p>
        </div>
        <Link href="/create" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse h-52" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-16 text-center">
          <Bot className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-base font-semibold text-zinc-400">No agents yet</p>
          <p className="text-sm text-zinc-600 mt-1 mb-6">Create your first AI agent in minutes</p>
          <Link href="/create" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white transition-all">Create your first agent</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
            return (
              <div key={agent.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-all group">
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {getInitials(agent.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{agent.name}</p>
                      {agent.template && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${TEMPLATE_COLORS[agent.template] || "bg-zinc-700 text-zinc-400"}`}>
                          {agent.template}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Status dot */}
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${agent.status === "active" ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
                    {agent.status === "active" ? "Active" : "Draft"}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {agent.whatsappNumber ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                      <span>{agent.whatsappNumber}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp not connected</span>
                    </div>
                  )}
                  {agent.didNumber ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono">{agent.didNumber}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <Phone className="w-3.5 h-3.5" />
                      <span>No phone number</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-zinc-800">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Open
                  </Link>
                  <Link href={`/settings?agent=${agent.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Add more card */}
          <Link href="/create" className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-zinc-600 hover:bg-zinc-900/80 transition-all group cursor-pointer min-h-[200px]">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
            </div>
            <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors font-medium">Add Agent</p>
          </Link>
        </div>
      )}
    </div>
  );
}
