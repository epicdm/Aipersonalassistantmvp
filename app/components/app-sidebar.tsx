"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Bot,
  MessageCircle,
  Phone,
  Radio,
  Users,
  BookOpen,
  Plug,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const NAV = [
  {
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard/agents", label: "Agents", icon: Bot },
      { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircle },
      { href: "/dashboard/calls", label: "Calls", icon: Phone },
      { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Radio },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { href: "/dashboard/contacts", label: "Contacts", icon: Users },
      { href: "/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-300",
  pro: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  business: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
};

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const router = useRouter();

  // Get plan from user metadata — fallback free
  const plan = (user?.publicMetadata?.plan as string) || "free";

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-60"} bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center ${collapsed ? "justify-center px-0" : "px-5"} border-b border-zinc-800/60 shrink-0`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm text-zinc-100 tracking-tight">
              EPIC <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1 scrollbar-none">
        {NAV.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {!collapsed && section.label && (
              <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-[17px] h-[17px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="mx-2 mb-2 flex items-center justify-center h-8 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User section */}
      <div className={`border-t border-zinc-800/60 p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"}
              </p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}>
                {plan}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
