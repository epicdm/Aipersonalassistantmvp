"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Phone, Bot, Radio } from "lucide-react";
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PushStatusBadge } from "@/app/components/push-badge";

type AgentOption = { id: string; name: string; didNumber: string | null };

function CallInProgress({ onHangup }: { onHangup: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  return (
    <DashboardShell>
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Phone className="w-8 h-8 text-green-400" />
        </div>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-zinc-900" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-100">
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
    </DashboardShell>
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Calls</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Make calls and manage your AI receptionist</p>
      </div>

      {/* Push notifications */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
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
            <p className="text-sm text-zinc-400 mt-1">From: {incomingCaller}</p>
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
        <div className="bg-zinc-900 border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Active Call</p>
            {roomName && <p className="text-xs text-zinc-500 font-mono">{roomName}</p>}
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <Phone className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Make a Call</p>
                <p className="text-xs text-zinc-500">Dial any number directly</p>
              </div>
            </div>
            <Input
              placeholder="e.g. 7675551234 or +17675551234"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialOut()}
              disabled={callState === "calling"}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500/50"
            />
            {agents.length > 1 && (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full text-xs border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-800 text-zinc-300"
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
                  <a href="/upgrade" className="ml-1 underline font-medium text-indigo-400">Upgrade →</a>
                )}
              </p>
            )}
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0"
              onClick={handleDialOut}
              disabled={callState === "calling" || !dialNumber.trim()}
            >
              {callState === "calling" ? "Connecting..." : "Call"}
            </Button>
          </div>

          {/* AI receptionist */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">AI Receptionist</p>
                <p className="text-xs text-zinc-500">Jenny answers calls automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-zinc-400">Active — ready to answer</span>
            </div>
            <p className="text-xs text-zinc-600">
              When someone calls your DID, Jenny picks up instantly and handles the conversation.
            </p>
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
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