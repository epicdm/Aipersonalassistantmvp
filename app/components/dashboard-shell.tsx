"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "@/app/components/app-sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen text-[#FAFAFA] overflow-hidden" style={{ backgroundColor: '#050505' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless mobileOpen */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#FAFAFA' }}>BFF</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
