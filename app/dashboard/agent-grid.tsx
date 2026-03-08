"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Plus, LogOut, Bot, MessageSquare, Phone, Zap,
  MoreHorizontal, Settings, ChevronRight,
} from "lucide-react";
import { TEMPLATES, getMaxAgents } from "@/app/lib/templates";

type Agent = {
  id: string;
  name: string;
  template: string | null;
  status: string;
  whatsappStatus: string;
  phoneNumber: string | null;
  createdAt: string;
};

type User = {
  plan: string;
};

export default function AgentGrid({ agents, user }: { agents: Agent[]; user: User }) {
  const router = useRouter();
  const maxAgents = getMaxAgents(user.plan);
  const canAddMore = agents.length < maxAgents;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <div className="border-b border-gray-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg">BFF</span>
            <span className="text-gray-500 text-sm ml-2">Your AI Team</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full capitalize">
            {user.plan} plan
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 transition cursor-pointer p-2 rounded-lg hover:bg-gray-800/50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Your Agents</h1>
            <p className="text-gray-500 mt-1">
              {agents.length} of {maxAgents === 999 ? "unlimited" : maxAgents} agents
            </p>
          </div>
          {canAddMore && (
            <button
              onClick={() => router.push("/create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Agent
            </button>
          )}
        </div>

        {/* Agent grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const tpl = TEMPLATES.find((t) => t.slug === agent.template);
            const color = tpl?.color || "from-indigo-500 to-violet-600";
            const emoji = tpl?.emoji || "🤖";
            const tagline = tpl?.tagline || "AI Agent";

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => router.push(`/dashboard/${agent.id}`)}
                className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-gray-600 hover:bg-gray-900/80 transition-all group relative"
              >
                {/* Gradient top accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${color} opacity-80`} />

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg`}
                  >
                    {emoji}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status dot */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        agent.status === "active" ? "bg-green-400" : "bg-gray-600"
                      }`}
                      title={agent.status}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/settings");
                      }}
                      className="text-gray-600 hover:text-gray-300 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-lg leading-tight">{agent.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{tagline}</p>

                {/* Channels */}
                <div className="flex items-center gap-2 mt-3">
                  {agent.whatsappStatus === "connected" && (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                      <MessageSquare className="w-3 h-3" />
                      WhatsApp
                    </span>
                  )}
                  {agent.phoneNumber && (
                    <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                      <Phone className="w-3 h-3" />
                      Phone
                    </span>
                  )}
                  {agent.whatsappStatus !== "connected" && !agent.phoneNumber && (
                    <span className="text-xs text-gray-600">No channels connected</span>
                  )}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                  <span className="text-xs text-gray-600">
                    {new Date(agent.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-indigo-400 transition flex items-center gap-1">
                    Open dashboard
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Add agent card */}
          {canAddMore ? (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: agents.length * 0.08 }}
              onClick={() => router.push("/create")}
              className="border-2 border-dashed border-gray-800 hover:border-gray-600 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-gray-400 transition-all cursor-pointer min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-800/80 flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Add Agent</p>
                <p className="text-xs mt-0.5 text-gray-700">
                  {maxAgents - agents.length} slot{maxAgents - agents.length !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </motion.button>
          ) : (
            <div className="border-2 border-dashed border-gray-800/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-700 min-h-[180px] opacity-50">
              <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Upgrade to add more</p>
                <p className="text-xs mt-0.5">
                  {user.plan === "free" ? "Free: 1 agent max" : "Pro: 3 agents max"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-900 rounded-3xl mx-auto flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">No agents yet</h3>
            <p className="text-gray-600 mt-2 mb-8">Create your first AI agent to get started</p>
            <button
              onClick={() => router.push("/create")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition cursor-pointer"
            >
              Create Your First Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
