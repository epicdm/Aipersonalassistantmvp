"use client";

import { useState, useEffect, useRef } from "react";
import DarkShell from "@/app/components/dark-shell";
import { Eye, Send, Lightbulb, Radio, RefreshCw, Bot, User, Shield } from "lucide-react";
import { toast } from "sonner";

type ChatMessage = { role: string; content: string };
type Session = { userId: string; userEmail: string; userName: string; agentName: string; messageCount: number; lastMessage: ChatMessage | null; messages: ChatMessage[] };

export default function SupervisionClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hintText, setHintText] = useState("");
  const [bargeText, setBargeText] = useState("");
  const [mode, setMode] = useState<"hint" | "barge">("hint");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try { const res = await fetch("/api/admin/conversations"); if (!res.ok) throw new Error(); const data = await res.json(); setSessions(data.activeSessions || []); if (selected) { const updated = (data.activeSessions || []).find((s: Session) => s.userId === selected.userId); if (updated) setSelected(updated); } } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); const i = setInterval(fetchSessions, 3000); return () => clearInterval(i); }, [selected?.userId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [selected?.messages]);

  const sendAction = async () => {
    if (!selected) return;
    const text = mode === "hint" ? hintText : bargeText;
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.userId, action: mode, message: text.trim() }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(mode === "hint" ? "💡 Hint sent" : "🎙️ Barge-in sent");
      setHintText(""); setBargeText(""); fetchSessions();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  };

  return (
    <DarkShell title="Supervision">
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* Sessions */}
        <div className="w-full md:w-72 shrink-0 bg-[#111111] rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#E2725B]" /><span className="font-bold text-sm">Live Sessions</span></div>
            <button onClick={fetchSessions} className="p-1.5 rounded-lg hover:bg-[#1A1A1A] cursor-pointer"><RefreshCw className="w-3.5 h-3.5 text-[#A1A1AA]" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-8 text-center"><Radio className="w-8 h-8 text-gray-700 mx-auto mb-2" /><p className="text-xs text-[#A1A1AA]">No active sessions</p></div>
            ) : sessions.map((s) => (
              <button key={s.userId} onClick={() => setSelected(s)} className={`w-full text-left p-3 border-b border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer ${selected?.userId === s.userId ? "bg-[#E2725B]/100/10 border-l-2 border-l-[#E2725B]" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="relative"><div className="w-8 h-8 bg-[#E2725B]/15 rounded-full flex items-center justify-center text-[#E2725B] text-xs font-bold">{s.userName.slice(0, 2).toUpperCase()}</div><div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white/[0.05]" /></div>
                  <div className="min-w-0"><p className="text-xs font-bold truncate">{s.userName}</p><p className="text-[10px] text-[#A1A1AA] truncate">{s.agentName} · {s.messageCount} msgs</p></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat view */}
        <div className="flex-1 flex flex-col bg-[#111111] rounded-2xl border border-white/[0.07] overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center"><div className="text-center"><Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-[#A1A1AA] font-semibold text-sm">Select a session</p></div></div>
          ) : (
            <>
              <div className="p-3 border-b border-white/[0.07] flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-7 h-7 bg-[#E2725B]/15 rounded-full flex items-center justify-center text-[#E2725B] text-xs font-bold">{selected.userName.slice(0, 2).toUpperCase()}</div><div><p className="font-bold text-xs">{selected.userName}</p><p className="text-[10px] text-[#A1A1AA]">{selected.agentName}</p></div></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /><span className="text-[10px] text-green-500 font-bold">LIVE</span></div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {selected.messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const isHint = msg.content.startsWith("[SUPERVISOR HINT]");
                  if (msg.role === "system" && !isHint) return null;
                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : isHint ? "justify-center" : "justify-start"}`}>
                      {isHint ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5"><Lightbulb className="w-3 h-3 text-amber-400" /><p className="text-[10px] text-amber-300">{msg.content.replace("[SUPERVISOR HINT]: ", "")}</p></div>
                      ) : (
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isUser ? "bg-[#E2725B] text-white" : "bg-[#1A1A1A] text-[#FAFAFA]"}`}>
                          <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-white/[0.07]">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setMode("hint")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${mode === "hint" ? "bg-amber-500/20 text-amber-400" : "bg-[#1A1A1A] text-[#A1A1AA]"}`}><Lightbulb className="w-3 h-3" /> Hint</button>
                  <button onClick={() => setMode("barge")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${mode === "barge" ? "bg-red-500/20 text-red-400" : "bg-[#1A1A1A] text-[#A1A1AA]"}`}><Radio className="w-3 h-3" /> Barge</button>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder={mode === "hint" ? "Hint for agent..." : "Message as agent..."} value={mode === "hint" ? hintText : bargeText} onChange={(e) => mode === "hint" ? setHintText(e.target.value) : setBargeText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAction()} className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg outline-none text-xs" />
                  <button onClick={sendAction} disabled={sending || !(mode === "hint" ? hintText : bargeText).trim()} className={`px-3 py-2 rounded-lg text-white font-bold text-xs cursor-pointer disabled:opacity-50 ${mode === "hint" ? "bg-amber-600" : "bg-red-600"}`}><Send className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DarkShell>
  );
}
