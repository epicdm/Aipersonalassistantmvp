"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Settings,
  MessageSquare,
  Phone,
  Menu,
  Wrench,
  BookOpen,
  Bot,
  LogOut,
  Users,
  Eye,
} from "lucide-react";
import { useState } from "react";

const navSections = [
  {
    label: "",
    items: [
      { href: "/dashboard", label: "Chat", icon: MessageCircle },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/settings", label: "Personality", icon: Bot },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { href: "/number", label: "Phone", icon: Phone },
    ],
  },
  {
    label: "Advanced",
    items: [
      { href: "/integrations", label: "Integrations", icon: Wrench },
      { href: "/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/admin", label: "Supervision", icon: Eye },
    ],
  },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans">
      {/* Desktop sidebar — slim */}
      <aside
        className={`${open ? "w-56" : "w-16"} bg-white border-r border-gray-100 hidden lg:flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="h-16 px-5 flex items-center border-b border-gray-50">
          <div className="flex items-center gap-2.5 font-black text-xl text-gray-900">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            {open && <span className="tracking-tight">AIVA</span>}
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label || "main"}>
              {open && section.label && (
                <div className="px-3 py-2 mt-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {open && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {open && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2 font-bold text-sm">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <span>AIVA</span>
          </div>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg bg-gray-100 cursor-pointer">
            <Menu className="w-4 h-4" />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
