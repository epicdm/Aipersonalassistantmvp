"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Plus, MessageSquare, Phone, Bot, LogOut,
} from "lucide-react";
import { TEMPLATES } from "@/app/lib/templates";
import { SignOutButton } from "@clerk/nextjs";

export default function AgentGrid({ agents, plan }: { agents: any[]; plan: string }) {
  const router = useRouter();
  const maxAgents = plan === "business" ? 999 : plan === "pro" ? 3 : 1;
  const canAdd = agents.length < maxAgents;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Agents</h1>
            <p className="text-gray-500 mt-1">{agents.length} agent{agents.length !== 1 ? "s" : ""} · {plan} plan</p>
          </div>
          <SignOutButton>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </SignOutButton>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const tpl = TEMPLATES.find((t) => t.slug === agent.template);
            const color = tpl?.color || "from-indigo-500 to-violet-600";
            const emoji = tpl?.emoji || "✨";

            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => router.push(`/dashboard/${agent.id}`)}
                className="text-left p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50 transition cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl`}>
                    {emoji}
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${agent.status === "active" ? "bg-green-500" : "bg-gray-600"}`} />
                </div>
                <h3 className="font-bold text-lg">{agent.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{tpl?.tagline || "Custom Agent"}</p>
                <div className="flex items-center gap-2 mt-4">
                  {agent.whatsappStatus === "connected" && (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </span>
                  )}
                  {agent.phoneNumber && (
                    <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">
                      <Phone className="w-3 h-3" /> Phone
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Add agent card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: agents.length * 0.08 }}
            onClick={() => canAdd ? router.push("/create") : null}
            className={`p-6 rounded-2xl border border-dashed transition cursor-pointer flex flex-col items-center justify-center min-h-[180px] ${
              canAdd
                ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
                : "border-gray-800 opacity-50 cursor-not-allowed"
            }`}
          >
            <Plus className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-500 font-medium">Add Agent</p>
            {!canAdd && (
              <p className="text-xs text-gray-600 mt-1">Upgrade to add more</p>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
