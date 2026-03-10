"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, MessageCircle, Zap, Crown, Plus, ChevronRight, Clock } from "lucide-react";
import StatCard from "@/app/components/stat-card";

type Agent = {
  id: string;
  name: string;
  template?: string;
  status: string;
  whatsappNumber?: string;
  updatedAt?: string;
};

type RecentMessage = {
  id: string;
  agentId: string;
  agentName?: string;
  phone: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TEMPLATE_COLORS: Record<string, string> = {
  receptionist: "bg-indigo-500/20 text-indigo-300",
  concierge: "bg-violet-500/20 text-violet-300",
  collections: "bg-amber-500/20 text-amber-300",
  sales: "bg-green-500/20 text-green-300",
  support: "bg-blue-500/20 text-blue-300",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent").then((r) => r.json()).catch(() => []),
      fetch("/api/conversations").then((r) => r.json()).catch(() => []),
    ]).then(([agentData, msgData]) => {
      setAgents(Array.isArray(agentData) ? agentData : []);
      // conversations returns array of conversations with messages
      const msgs: RecentMessage[] = [];
      if (Array.isArray(msgData)) {
        for (const conv of msgData.slice(0, 20)) {
          if (conv.messages?.length) {
            const last = conv.messages[conv.messages.length - 1];
            msgs.push({
              id: conv.id,
              agentId: conv.agentId,
              agentName: conv.agent?.name,
              phone: conv.contact?.phone || conv.contactId,
              content: last.text,
              role: last.direction === "inbound" ? "user" : "assistant",
              timestamp: last.createdAt || conv.updatedAt,
            });
          }
        }
      }
      setMessages(msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
      setLoading(false);
    });
  }, []);

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalAgents = agents.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your AI workforce at a glance</p>
        </div>
        <Link href="/create" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Total Agents" value={loading ? "—" : totalAgents} sub={`${activeAgents} active`} color="indigo" />
        <StatCard icon={MessageCircle} label="Conversations" value={loading ? "—" : messages.length} sub="recent" color="green" />
        <StatCard icon={Zap} label="Messages Today" value={loading ? "—" : messages.filter(m => {
          const d = new Date(m.timestamp);
          const now = new Date();
          return d.toDateString() === now.toDateString();
        }).length} color="violet" />
        <StatCard icon={Crown} label="Plan" value="Free" sub="Upgrade for more →" color="amber" />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Agents — 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Your Agents</h2>
            <Link href="/dashboard/agents" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-10 text-center">
              <Bot className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No agents yet</p>
              <p className="text-xs text-zinc-600 mt-1 mb-4">Create your first AI agent to get started</p>
              <Link href="/create" className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white transition-all">Create Agent</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-indigo-500/20">
                    {getInitials(agent.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{agent.name}</p>
                      {agent.template && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${TEMPLATE_COLORS[agent.template] || "bg-zinc-700 text-zinc-300"}`}>
                          {agent.template}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`flex items-center gap-1 text-xs ${agent.status === "active" ? "text-green-400" : "text-zinc-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
                        {agent.status === "active" ? "Active" : "Draft"}
                      </span>
                      {agent.whatsappNumber && (
                        <span className="text-xs text-zinc-500">· {agent.whatsappNumber}</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/agents/${agent.id}`} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Recent Activity</h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 animate-pulse h-16" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-300 truncate">{msg.phone}</p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {relativeTime(msg.timestamp)}
                    </span>
                  </div>
                  {msg.agentName && (
                    <p className="text-[10px] text-indigo-400 mt-1">via {msg.agentName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
