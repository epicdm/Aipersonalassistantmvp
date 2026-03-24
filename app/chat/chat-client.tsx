"use client";

import SidebarLayout from "@/app/components/sidebar-layout";
import { ChatPreview } from "@/app/components/chat-preview";

export default function ChatClient({ agent }: { agent: any }) {
  const name = agent?.config?.name || agent?.name || "AIVA";
  const purpose = agent?.config?.purpose || agent?.purpose || "";
  const tone = agent?.config?.tone || "Professional";

  return (
    <SidebarLayout>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#FAFAFA]">Chat Preview</h1>
          <p className="text-[#A1A1AA]">Test your agent in a sandbox conversation</p>
        </div>
        <ChatPreview
          agentName={name}
          agentPurpose={purpose}
          agentTone={tone}
          enabledTools={["calendar", "knowledge"]}
        />
      </div>
    </SidebarLayout>
  );
}
