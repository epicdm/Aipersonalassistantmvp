"use client"

import "@livekit/components-styles"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useConnectionState,
  useRoomContext,
  useTrackToggle,
  useVoiceAssistant,
} from "@livekit/components-react"
import { ConnectionState, Track } from "livekit-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────
type AppState = "idle" | "fetching" | "connected" | "error"

interface TokenData {
  token: string
  url: string
  roomName: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

// ── Inner component (must be inside LiveKitRoom) ─────────────────────────────
function CallControls({ onDisconnect }: { onDisconnect: () => void }) {
  const connectionState = useConnectionState()
  const { buttonProps, enabled: micEnabled } = useTrackToggle({ source: Track.Source.Microphone })
  const room = useRoomContext()

  // useVoiceAssistant uses RoomContext (not SessionContext) — works inside LiveKitRoom
  const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant()

  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  // Start timer when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !startedRef.current) {
      startedRef.current = true
      setDuration(0)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [connectionState])

  const handleDisconnect = useCallback(() => {
    room.disconnect()
    onDisconnect()
  }, [room, onDisconnect])

  // Agent state label
  const agentLabel =
    agentState === "listening" ? "🎙 Listening"
    : agentState === "speaking" ? "🔊 Speaking"
    : agentState === "thinking" ? "💭 Thinking"
    : agentState === "initializing" ? "⚙️ Initializing"
    : agentState === "pre-connect-buffering" ? "⏳ Buffering"
    : null

  const isConnecting = connectionState === ConnectionState.Connecting
  const isConnected = connectionState === ConnectionState.Connected

  return (
    <div className="space-y-4">
      {/* Connection status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {isConnected && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
          <span className="text-sm text-muted-foreground">
            {isConnecting ? "Connecting…" : isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {isConnected && (
          <span className="text-sm font-mono text-muted-foreground">{formatDuration(duration)}</span>
        )}
      </div>

      {/* Agent state + visualizer */}
      {isConnected && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Jenny</span>
            {agentLabel && (
              <span className="text-xs text-muted-foreground">{agentLabel}</span>
            )}
          </div>
          {agentAudioTrack ? (
            <BarVisualizer
              state={agentState}
              barCount={12}
              trackRef={agentAudioTrack}
              className="h-10 w-full"
              options={{ minHeight: 3 }}
            />
          ) : (
            <div className="h-10 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {agentState === "connecting" || agentState === "disconnected"
                  ? "Waiting for agent…"
                  : "Agent connected"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          {...buttonProps}
          size="sm"
          variant={micEnabled ? "outline" : "secondary"}
          className="flex-1"
          disabled={!isConnected}
        >
          {micEnabled ? (
            <><Mic className="w-3.5 h-3.5 mr-1" /> Mute</>
          ) : (
            <><MicOff className="w-3.5 h-3.5 mr-1" /> Unmute</>
          )}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={handleDisconnect}
        >
          <PhoneOff className="w-3.5 h-3.5 mr-1" />
          Hang Up
        </Button>
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────
export default function Softphone() {
  const [appState, setAppState] = useState<AppState>("idle")
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const startCall = useCallback(async () => {
    setAppState("fetching")
    setErrorMsg("")
    try {
      const res = await fetch("/api/livekit/token")
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`)
      }
      const data: TokenData = await res.json()
      setTokenData(data)
      setAppState("connected")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect")
      setAppState("error")
    }
  }, [])

  const endCall = useCallback(() => {
    setTokenData(null)
    setAppState("idle")
  }, [])

  // Badge
  const badgeVariant: "default" | "secondary" | "destructive" | "outline" =
    appState === "connected" ? "default"
    : appState === "error" ? "destructive"
    : "secondary"

  const badgeLabel: Record<AppState, string> = {
    idle: "Idle",
    fetching: "Connecting",
    connected: "In Call",
    error: "Error",
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
          <Badge variant={badgeVariant} className="text-xs">
            {badgeLabel[appState]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {appState === "idle" && "Click Call to speak with Jenny"}
          {appState === "fetching" && "Getting session token…"}
          {appState === "connected" && "Voice session active"}
          {appState === "error" && errorMsg}
        </p>
      </CardHeader>

      <CardContent>
        {/* ── Idle / Error / Fetching: show Call button ── */}
        {(appState === "idle" || appState === "error" || appState === "fetching") && (
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={startCall}
              disabled={appState === "fetching"}
            >
              {appState === "fetching" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
              ) : (
                <><Phone className="w-4 h-4 mr-2" /> Call Jenny</>
              )}
            </Button>
            {appState === "error" && (
              <p className="text-xs text-destructive text-center">{errorMsg}</p>
            )}
          </div>
        )}

        {/* ── Connected: LiveKit room ── */}
        {appState === "connected" && tokenData && (
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.url}
            connect={true}
            audio={true}
            video={false}
            onDisconnected={endCall}
          >
            <RoomAudioRenderer />
            <CallControls onDisconnect={endCall} />
          </LiveKitRoom>
        )}
      </CardContent>
    </Card>
  )
}
