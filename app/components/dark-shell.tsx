"use client";

import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Settings,
  MessageSquare,
  Phone,
  BookOpen,
  Eye,
  LogOut,
  Bot,
  MessageCircle,
} from "lucide-react";

/**
 * Dark shell wrapper — replaces the white SidebarLayout.
 * Thin top bar with back button + page title + nav icons.
 * Matches the creation ritual / dashboard dark aesthetic.
 */
export default function DarkShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-sm">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/dashboard")} className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-all cursor-pointer" title="Chat">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={() => router.push("/contacts")} className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-all cursor-pointer" title="Contacts">
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => router.push("/settings")} className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-all cursor-pointer" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        {children}
      </div>
    </div>
  );
}
