"use client";

import SidebarLayout from "@/app/components/sidebar-layout";
import { Overview } from "@/app/components/overview";

export default function DashboardClient() {
  return (
    <SidebarLayout>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Performance Overview</h1>
          <p className="text-gray-500">Real-time analytics and system health</p>
        </div>
        <Overview onNavigate={() => {}} />
      </div>
    </SidebarLayout>
  );
}
