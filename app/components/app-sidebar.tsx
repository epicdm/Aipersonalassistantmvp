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
  free: "bg-white/10 text-[#A1A1AA]",
  pro: "bg-[#E2725B]/20 text-[#E2725B] border border-[#E2725B]/30",
  business: "bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/30",
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
      className={`${collapsed ? "w-16" : "w-60"} flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0`}
      style={{ backgroundColor: '#050505', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center ${collapsed ? "justify-center px-0" : "px-5"} shrink-0`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#E2725B' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#FAFAFA' }}>
              BFF
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1 scrollbar-none">
        {NAV.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {!collapsed && section.label && (
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
                  style={{
                    backgroundColor: active ? 'rgba(226,114,91,0.12)' : 'transparent',
                    color: active ? '#E2725B' : '#A1A1AA',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#FAFAFA'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#A1A1AA'; } }}
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
        className="mx-2 mb-2 flex items-center justify-center h-8 rounded-lg transition-colors cursor-pointer"
        style={{ color: 'rgba(255,255,255,0.2)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User section */}
      <div className={`p-3 ${collapsed ? "flex justify-center" : ""}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {collapsed ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "#FAFAFA" }}>
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
