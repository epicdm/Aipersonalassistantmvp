"use client";

import { useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import DashboardShell from "@/app/components/dashboard-shell";

export default function DashboardSettingsPage() {
  const { user } = useUser();

  return (
    <DashboardShell>
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <UserProfile
          appearance={{
            baseTheme: undefined,
            elements: {
              rootBox: "w-full",
              card: "bg-zinc-900 shadow-none border-0 rounded-none",
              navbar: "bg-zinc-900 border-r border-zinc-800",
              navbarButton: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
              navbarButtonActive: "text-indigo-400 bg-indigo-500/10",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput: "bg-zinc-800 border-zinc-700 text-zinc-200",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
              profileSectionTitle: "text-zinc-300",
              profileSectionContent: "text-zinc-400",
              dividerLine: "bg-zinc-800",
              badge: "bg-indigo-500/20 text-indigo-300",
            },
          }}
        />
      </div>
    </div>
    </DashboardShell>
  );
}