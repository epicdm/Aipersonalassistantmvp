"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Phone, Bot, Radio } from "lucide-react";
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PushStatusBadge } from "@/app/components/push-badge";
import DashboardShell from "@/app/components/dashboard-shell";

type AgentOption = { id: string; name: string; didNumber: string | null };

function CallInProgress({ onHangup }: { onHangup: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Phone className="w-8 h-8 text-green-400" />
        </div>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white/[0.08]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[#FAFAFA]">
          {state === "speaking" ? "Jenny is speaking..." : state === "listening" ? "Jenny is listening..." : "Connected"}
        </p>
        <p className="text-xs text-green-400 mt-1">● Live call</p>
      </div>
      <div className="w-full max-w-xs h-12">
        <BarVisualizer state={state} trackRef={audioTrack} barCount={9} style={{ width: "100%", height: "100%" }} />
      </div>
      <Button
        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-full px-10"
        onClick={() => { room.disconnect(); onHangup(); }}
      >
        Hang Up
      </Button>
    </div>
  );
}

export default function CallsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [dialNumber, setDialNumber] = useState("");
  const [callState, setCallState] = useState<"idle" | "calling" | "connected" | "incoming">("idle");
  const [lkToken, setLkToken] = useState("");
  const [lkUrl, setLkUrl] = useState("");
  const [roomName, setRoomName] = useState("");
  const [incomingCaller, setIncomingCaller] = useState("");
  const [callError, setCallError] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data);
          if (data.length > 0) setSelectedAgent(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Poll for incoming calls
  useEffect(() => {
    if (callState !== "idle" || !userId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/incoming?userId=${userId}`);
        const data = await res.json();
        if (data?.call) {
          setIncomingCaller(data.call.caller || "Unknown");
          setRoomName(data.call.roomName || "");
          setCallState("incoming");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [callState, userId]);

  const handleDialOut = async () => {
    if (!dialNumber.trim()) return;
    setCallError("");
    setCallState("calling");
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: dialNumber, agentId: selectedAgent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCallError(data.upgrade ? "📞 PSTN calling requires Pro plan" : data.error || "Call failed");
        setCallState("idle");
        return;
      }
      setLkToken(data.token);
      setLkUrl(data.url);
      setRoomName(data.roomName);
      setCallState("connected");
    } catch {
      setCallError("Network error — please try again");
      setCallState("idle");
    }
  };

  const handleAnswerIncoming = async () => {
    setCallError("");
    setCallState("calling");
    try {
      const res = await fetch("/api/livekit/token");
      const data = await res.json();
      if (!res.ok) { setCallError(data.error || "Failed to join call"); setCallState("idle"); return; }
      await fetch("/api/calls/incoming", { method: "DELETE" });
      setLkToken(data.token);
      setLkUrl(data.url);
      setRoomName(data.roomName);
      setCallState("connected");
    } catch {
      setCallError("Failed to answer call");
      setCallState("idle");
    }
  };

  const handleDeclineIncoming = async () => {
    await fetch("/api/calls/incoming", { method: "DELETE" });
    setCallState("idle");
    setIncomingCaller("");
  };

  const handleHangup = () => {
    setCallState("idle");
    setLkToken("");
    setLkUrl("");
    setRoomName("");
    setDialNumber("");
  };

  return (
    <DashboardShell>
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#FAFAFA]">Calls</h1>
        <p className="text-sm text-[#A1A1AA] mt-0.5">Make calls and manage your AI receptionist</p>
      </div>

      {/* Push notifications */}
      <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4">
        <PushStatusBadge />
      </div>

      {/* Incoming call alert */}
      {callState === "incoming" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-300 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Incoming Call
            </p>
            <p className="text-sm text-[#A1A1AA] mt-1">From: {incomingCaller}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={handleAnswerIncoming}>
              Answer
            </Button>
            <Button size="sm" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" onClick={handleDeclineIncoming}>
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Active call */}
      {callState === "connected" && lkToken && (
        <div className="bg-[#111111] border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#FAFAFA]">Active Call</p>
            {roomName && <p className="text-xs text-[#A1A1AA] font-mono">{roomName}</p>}
          </div>
          <LiveKitRoom token={lkToken} serverUrl={lkUrl} connect={true} audio={true} video={false} onDisconnected={handleHangup}>
            <RoomAudioRenderer />
            <CallInProgress onHangup={handleHangup} />
          </LiveKitRoom>
        </div>
      )}

      {/* Dialer + AI status */}
      {(callState === "idle" || callState === "calling") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dialer */}
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#E2725B]/10 rounded-xl flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#E2725B]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#FAFAFA]">Make a Call</p>
                <p className="text-xs text-[#A1A1AA]">Dial any number directly</p>
              </div>
            </div>
            <Input
              placeholder="e.g. 7675551234 or +17675551234"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialOut()}
              disabled={callState === "calling"}
              className="bg-[#1A1A1A] border-white/10 text-[#FAFAFA] placeholder:text-white/30 focus-visible:ring-[#E2725B]/50"
            />
            {agents.length > 1 && (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full text-xs border border-white/10 rounded-lg px-3 py-2 bg-[#1A1A1A] text-[#FAFAFA]/80"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.didNumber ? ` (${a.didNumber})` : ""}
                  </option>
                ))}
              </select>
            )}
            {callError && (
              <p className="text-xs text-red-400">
                {callError}
                {callError.includes("Pro plan") && (
                  <a href="/upgrade" className="ml-1 underline font-medium text-[#E2725B]">Upgrade →</a>
                )}
              </p>
            )}
            <Button
              className="w-full bg-gradient-to-r from-[#E2725B] to-[#D4A373] hover:from-[#F48B76] hover:to-[#D4A373] text-white border-0"
              onClick={handleDialOut}
              disabled={callState === "calling" || !dialNumber.trim()}
            >
              {callState === "calling" ? "Connecting..." : "Call"}
            </Button>
          </div>

          {/* AI receptionist */}
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#D4A373]/10 rounded-xl flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#D4A373]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#FAFAFA]">AI Receptionist</p>
                <p className="text-xs text-[#A1A1AA]">Jenny answers calls automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-[#A1A1AA]">Active — ready to answer</span>
            </div>
            <p className="text-xs text-white/30">
              When someone calls your DID, Jenny picks up instantly and handles the conversation.
            </p>
            <Button
              variant="outline"
              className="w-full border-white/10 text-[#FAFAFA]/80 hover:bg-[#1A1A1A] hover:text-[#FAFAFA]"
              onClick={async () => {
                const res = await fetch("/api/livekit/token");
                const data = await res.json();
                if (data.token) {
                  setLkToken(data.token);
                  setLkUrl(data.url);
                  setRoomName(data.roomName);
                  setCallState("connected");
                }
              }}
            >
              Talk to Jenny (free)
            </Button>
          </div>
        </div>
      )}
    </div>
    </DashboardShell>
  );
}