"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircle, Search, Bot, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  direction: string;
  text: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  agentId: string;
  agent?: { name: string };
  contact?: { name?: string; phone?: string };
  contactId: string;
  status: string;
  updatedAt: string;
  messages?: Message[];
};

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const filtered = conversations.filter((c) => {
    const name = c.contact?.name || c.contact?.phone || c.contactId;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const displayName = (c: Conversation) =>
    c.contact?.name || c.contact?.phone || c.contactId;

  const lastMessage = (c: Conversation) => {
    const msgs = c.messages || [];
    return msgs[msgs.length - 1];
  };

  return (
    <DashboardShell>
    <div className="flex h-full overflow-hidden">
      {/* Left: conversation list */}
      <div className="w-72 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-sm font-bold text-zinc-100 mb-3">Conversations</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No conversations yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filtered.map((conv) => {
                const last = lastMessage(conv);
                const isSelected = selected?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelected(conv)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                      isSelected ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {getInitials(displayName(conv))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-zinc-200 truncate">{displayName(conv)}</p>
                          {last && <span className="text-[10px] text-zinc-600 shrink-0">{relativeTime(last.createdAt)}</span>}
                        </div>
                        {last && <p className="text-[11px] text-zinc-500 truncate mt-0.5">{last.text}</p>}
                        {conv.agent?.name && (
                          <p className="text-[10px] text-indigo-400 mt-0.5">via {conv.agent.name}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: message thread */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(displayName(selected))}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">{displayName(selected)}</p>
                {selected.agent?.name && <p className="text-xs text-zinc-500">via {selected.agent.name}</p>}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-2xl mx-auto">
                {(selected.messages || []).length === 0 ? (
                  <p className="text-center text-xs text-zinc-600 py-12">No messages in this conversation</p>
                ) : (
                  (selected.messages || []).map((msg) => {
                    const isUser = msg.direction === "inbound";
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                            <Bot className="w-3 h-3" />
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            isUser
                              ? "bg-indigo-500 text-white rounded-tr-sm"
                              : "bg-zinc-800 text-zinc-200 rounded-tl-sm"
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-zinc-600 mt-1 px-1">{fmtTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
    </DashboardShell>
  );
}