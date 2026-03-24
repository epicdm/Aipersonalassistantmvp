"use client";
import DarkShell from "@/app/components/dark-shell";
import { Calendar, Mail, Brain, Database, Globe, MessageSquare } from "lucide-react";

const INTEGRATIONS = [
  { name: "Google Calendar", desc: "Schedule meetings and manage events", icon: Calendar, color: "text-blue-400 bg-blue-500/10", status: "available" },
  { name: "Gmail", desc: "Send and read emails", icon: Mail, color: "text-red-400 bg-red-500/10", status: "available" },
  { name: "Knowledge Base", desc: "Upload docs for your agent to learn", icon: Brain, color: "text-purple-400 bg-purple-500/10", status: "available" },
  { name: "Notion", desc: "Connect your Notion workspace", icon: Database, color: "text-[#FAFAFA]/80 bg-gray-500/10", status: "coming" },
  { name: "Slack", desc: "Post and read messages in Slack", icon: MessageSquare, color: "text-yellow-400 bg-yellow-500/10", status: "coming" },
  { name: "Web Search", desc: "Research anything online", icon: Globe, color: "text-green-400 bg-green-500/10", status: "available" },
];

export default function IntegrationsClient() {
  return (
    <DarkShell title="Integrations">
      <h2 className="text-2xl font-bold mb-2">Integrations</h2>
      <p className="text-[#A1A1AA] text-sm mb-8">Connect services to expand your agent's abilities</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTEGRATIONS.map((int) => (
          <div key={int.name} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-5 flex items-start gap-4 hover:border-white/10 transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${int.color}`}>
              <int.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">{int.name}</p>
                {int.status === "coming" && <span className="text-[9px] px-2 py-0.5 bg-[#1A1A1A] text-[#A1A1AA] rounded-full font-bold">COMING SOON</span>}
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">{int.desc}</p>
            </div>
            {int.status === "available" && (
              <button className="px-4 py-2 bg-[#E2725B]/10 text-[#E2725B] rounded-lg text-xs font-bold hover:bg-[#E2725B]/20 transition-all cursor-pointer">Connect</button>
            )}
          </div>
        ))}
      </div>
    </DarkShell>
  );
}
