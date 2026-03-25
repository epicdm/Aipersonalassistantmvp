"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/app/components/dashboard-shell";
import {
  MessageSquare, AlertCircle, Cpu, TrendingUp, TrendingDown,
  CheckCircle, Edit3, UserX, Zap, ChevronRight, ArrowRight,
  Activity, Users, Bot, Bell
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  activeAgents: number;
  pendingApproval: number;
  totalMessages: number;
  messagesChange: number;
  leadConversion: number;
  conversionChange: number;
  escalated: number;
  walletBalance: string;
  systemHealth: string;
}

interface RecentActivity {
  id: string;
  contact: string;
  message: string;
  status: "needs_approval" | "human_requested" | "ai_active" | "resolved";
  time: string;
  draft?: string;
}

const STATUS_CONFIG = {
  needs_approval: { label: "Needs Approval", bg: "bg-[#5dfd8a]/20", text: "text-[#006d2f]", dot: "bg-[#5dfd8a]" },
  human_requested: { label: "Human Requested", bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  ai_active: { label: "AI Active", bg: "bg-[#004B57]/20", text: "text-[#5dfd8a]", dot: "bg-[#5dfd8a]" },
  resolved: { label: "Resolved", bg: "bg-white/5", text: "text-[#A1A1AA]", dot: "bg-[#A1A1AA]" },
};

function SparkBar({ values, color }: { values: number[], color: string }) {
  const max = Math.max(...values);
  return (
    <div className="h-12 flex items-end gap-0.5 w-full">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm transition-all ${i === values.length - 1 ? color : color + '/30'}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!isLoaded) return;
    Promise.all([
      fetch("/api/agent").then(r => r.json()).catch(() => ({})),
      fetch("/api/conversations").then(r => r.json()).catch(() => []),
    ]).then(([agentData, convData]) => {
      const agentList = Array.isArray(agentData?.agents) ? agentData.agents
        : agentData?.agent ? [agentData.agent] : [];
      setAgents(agentList);

      const activeCount = agentList.filter((a: any) => a.status === "active").length;
      const convList = Array.isArray(convData) ? convData : [];

      setStats({
        activeAgents: activeCount,
        pendingApproval: 0,
        totalMessages: convList.reduce((s: number, c: any) => s + (c.messageCount || 0), 0),
        messagesChange: 12,
        leadConversion: 18.4,
        conversionChange: 4.2,
        escalated: 0,
        walletBalance: "$0.00",
        systemHealth: "All systems operational",
      });

      setActivity(convList.slice(0, 5).map((c: any) => ({
        id: c.id,
        contact: c.contactName || c.contactPhone || "Unknown",
        message: c.lastMessage || "No messages yet",
        status: "ai_active" as const,
        time: c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      })));
    }).finally(() => setLoading(false));
  }, [isLoaded]);

  if (!isLoaded || loading) {
    return (
      <DashboardShell>
        <div className="p-6 space-y-6 max-w-4xl mx-auto animate-pulse">
          <div className="h-12 rounded-xl bg-white/5 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-white/5" />)}
          </div>
          <div className="h-48 rounded-xl bg-white/5" />
        </div>
      </DashboardShell>
    );
  }

  // No agents yet → redirect to create
  if (agents.length === 0) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,75,87,0.2)' }}>
            <Bot className="w-10 h-10" style={{ color: '#5dfd8a' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>
              {greeting}, {firstName}
            </h1>
            <p style={{ color: '#A1A1AA' }}>Set up your first AI agent to get started.</p>
          </div>
          <Link href="/create"
            className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm transition-all"
            style={{ backgroundColor: '#00333c', color: '#5dfd8a', border: '1px solid rgba(93,253,138,0.2)' }}
          >
            Create your first agent <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-16 space-y-10">

        {/* ── Greeting ── */}
        <section className="space-y-2">
          <h1 className="font-extrabold text-4xl tracking-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>
            {greeting}, {firstName}
          </h1>
          <p className="text-lg max-w-lg leading-relaxed" style={{ color: '#A1A1AA' }}>
            {stats && stats.totalMessages > 0
              ? <>Your AI handled <span className="font-bold" style={{ color: '#5dfd8a' }}>{stats.totalMessages} messages</span> so far. Here's what needs attention.</>
              : "Your AI agents are ready. Connect WhatsApp to start receiving messages."}
          </p>
        </section>

        {/* ── Bento Status Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Agents */}
          <div className="p-6 rounded-xl flex flex-col justify-between min-h-[140px]"
            style={{ background: 'linear-gradient(135deg, #00333c, #004B57)', boxShadow: '0 8px 32px rgba(0,51,60,0.4)' }}>
            <div className="flex justify-between items-start">
              <Bot className="w-5 h-5" style={{ color: '#5dfd8a' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(93,253,138,0.2)', color: '#5dfd8a' }}>
                Active
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-3xl tracking-tight" style={{ color: '#FAFAFA', fontFamily: "'EB Garamond', Georgia, serif" }}>
                {stats?.activeAgents ?? 0}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>AI Agents running</p>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="p-6 rounded-xl flex flex-col justify-between min-h-[140px]"
            style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-start">
              <AlertCircle className="w-5 h-5" style={{ color: stats?.pendingApproval ? '#f59e0b' : '#A1A1AA' }} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="font-extrabold text-3xl tracking-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>
                  {stats?.pendingApproval ?? 0}
                </h3>
                {(stats?.pendingApproval ?? 0) > 0 && (
                  <span className="text-[10px] font-bold uppercase" style={{ color: '#f59e0b' }}>Review</span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: '#A1A1AA' }}>Awaiting approval</p>
            </div>
          </div>

          {/* System Health */}
          <div className="p-6 rounded-xl flex flex-col justify-between min-h-[140px]"
            style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-start">
              <Cpu className="w-5 h-5" style={{ color: '#5dfd8a' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#5dfd8a' }} />
                <h3 className="font-bold text-base" style={{ color: '#FAFAFA' }}>All systems ok</h3>
              </div>
              <p className="text-sm mt-1" style={{ color: '#A1A1AA' }}>Platform operational</p>
            </div>
          </div>
        </section>

        {/* ── Performance Snapshot ── */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>
              Performance Snapshot
            </h2>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Messages */}
            <div className="p-6 rounded-xl space-y-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>Total Messages</p>
                  <h4 className="text-3xl font-extrabold tracking-tight mt-1" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>
                    {(stats?.totalMessages ?? 0).toLocaleString()}
                  </h4>
                </div>
                <span className="text-sm font-bold flex items-center gap-1" style={{ color: '#5dfd8a' }}>
                  <TrendingUp className="w-3.5 h-3.5" /> +{stats?.messagesChange}%
                </span>
              </div>
              <SparkBar values={[30, 55, 40, 70, 60, 90, 75]} color="bg-[#004B57]" />
            </div>

            {/* Conversion */}
            <div className="p-6 rounded-xl space-y-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>Lead Conversion</p>
                  <h4 className="text-3xl font-extrabold tracking-tight mt-1" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>
                    {stats?.leadConversion ?? 0}%
                  </h4>
                </div>
                <span className="text-sm font-bold flex items-center gap-1" style={{ color: '#5dfd8a' }}>
                  <TrendingUp className="w-3.5 h-3.5" /> +{stats?.conversionChange}%
                </span>
              </div>
              <SparkBar values={[50, 65, 35, 55, 70, 100, 80]} color="bg-[#5dfd8a]" />
            </div>
          </div>
        </section>

        {/* ── Recent Activity / Live Monitor ── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>
                Recent Activity
              </h2>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </div>
            <Link href="/dashboard/conversations" className="text-sm font-semibold flex items-center gap-1 transition-colors"
              style={{ color: '#5dfd8a' }}>
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="p-8 rounded-xl text-center" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: '#A1A1AA' }} />
              <p className="font-medium" style={{ color: '#FAFAFA' }}>No conversations yet</p>
              <p className="text-sm mt-1" style={{ color: '#A1A1AA' }}>
                Connect your WhatsApp number to start receiving messages.
              </p>
              <Link href="/number"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ backgroundColor: '#00333c', color: '#5dfd8a', border: '1px solid rgba(93,253,138,0.2)' }}
              >
                Connect WhatsApp <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status];
                return (
                  <div key={item.id}
                    className="p-5 rounded-xl flex items-center gap-5 transition-all cursor-pointer"
                    style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1A1A1A')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111111')}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
                      style={{ backgroundColor: '#004B57', color: '#FAFAFA' }}>
                      {item.contact.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate" style={{ color: '#FAFAFA' }}>{item.contact}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#A1A1AA' }}>{item.message}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: '#A1A1AA' }}>{item.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Agent Cards ── */}
        {agents.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>
                Your Agents
              </h2>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agents.map((agent: any) => (
                <Link key={agent.id} href={`/dashboard/${agent.id}`}
                  className="p-5 rounded-xl flex items-center gap-4 transition-all"
                  style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(93,253,138,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg"
                    style={{ backgroundColor: '#00333c', color: '#5dfd8a' }}>
                    {(agent.name || "A").slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#FAFAFA' }}>{agent.name}</p>
                    <p className="text-xs mt-0.5 capitalize" style={{ color: '#A1A1AA' }}>{agent.template} · {agent.status}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: agent.status === 'active' ? '#5dfd8a' : '#A1A1AA' }} />
                    <span className="text-xs" style={{ color: agent.status === 'active' ? '#5dfd8a' : '#A1A1AA' }}>
                      {agent.status === 'active' ? 'Live' : agent.status}
                    </span>
                  </div>
                </Link>
              ))}

              {/* Add agent CTA */}
              <Link href="/create"
                className="p-5 rounded-xl flex items-center gap-4 transition-all"
                style={{ border: '2px dashed rgba(255,255,255,0.1)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(93,253,138,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-2xl" style={{ color: '#A1A1AA' }}>+</span>
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#A1A1AA' }}>New Agent</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Create another AI agent</p>
                </div>
              </Link>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
