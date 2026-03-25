"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useState } from "react";

const NAV = [
  { href: "/dashboard",                  icon: "home",                  label: "Home",          exact: true },
  { href: "/dashboard/conversations",    icon: "chat_bubble",           label: "Conversations" },
  { href: "/dashboard/agents",           icon: "smart_toy",             label: "Agents" },
  { href: "/dashboard/calls",            icon: "phone",                 label: "Calls" },
  { href: "/dashboard/broadcasts",       icon: "campaign",              label: "Broadcasts" },
  { href: "/knowledge",                  icon: "auto_stories",          label: "Knowledge" },
  { href: "/integrations",              icon: "extension",             label: "Integrations" },
  { href: "/dashboard/billing",          icon: "account_balance_wallet", label: "Billing" },
  { href: "/dashboard/settings",         icon: "settings",              label: "Settings" },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-60"} flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0`}
      style={{ backgroundColor: "#191c1d", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center ${collapsed ? "justify-center" : "px-4"} shrink-0`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span
            className="material-symbols-outlined text-2xl shrink-0"
            style={{ color: "#5dfd8a", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            bubble_chart
          </span>
          {!collapsed && (
            <span
              className="font-manrope font-bold text-lg tracking-tight"
              style={{ color: "#004B57", fontFamily: "'Manrope', sans-serif" }}
            >
              BFF
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto no-scrollbar space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center" : ""
              }`}
              style={{
                backgroundColor: active ? "rgba(0,75,87,0.25)" : "transparent",
                color: active ? "#5dfd8a" : "#94a3b8",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "#e2e8f0";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={{
                  fontSize: "20px",
                  fontVariationSettings: active
                    ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
              >
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="mx-2 mb-2 flex items-center justify-center h-8 rounded-xl transition-all cursor-pointer"
        style={{ color: "#475569" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#94a3b8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {/* User */}
      <div
        className={`p-3 ${collapsed ? "flex justify-center" : "flex items-center gap-3"}`}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <UserButton afterSignOutUrl="/" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>
              {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "#475569", fontFamily: "'Inter', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {(user?.publicMetadata?.plan as string) || "free"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
