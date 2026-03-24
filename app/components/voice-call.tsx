'use client'

import { useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, PhoneOff, Phone, Loader2 } from 'lucide-react'
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  DisconnectButton,
} from '@livekit/components-react'
import '@livekit/components-styles'

// ─── Types ─────────────────────────────────────────────────────
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface LiveKitToken {
  token: string
  url: string
  roomName: string
}

// ─── Inner component (used inside LiveKitRoom) ─────────────────
function VoiceCallInner({ agentName, onDisconnect }: { agentName: string; onDisconnect: () => void }) {
  const { state, audioTrack } = useVoiceAssistant()

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Visualizer */}
      <div className="w-full h-16 flex items-center justify-center">
        <BarVisualizer
          state={state}
          barCount={7}
          trackRef={audioTrack}
          className="w-full h-full"
          options={{ minHeight: 4 }}
        />
      </div>

      {/* Status label */}
      <p className="text-xs text-muted-foreground">
        {state === 'speaking' ? `${agentName} is speaking...` :
         state === 'listening' ? 'Listening...' :
         state === 'thinking' ? 'Thinking...' :
         'Connected'}
      </p>

      {/* Audio renderer + disconnect */}
      <RoomAudioRenderer />
      <DisconnectButton onClick={onDisconnect}>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Call
        </button>
      </DisconnectButton>
    </div>
  )
}

// ─── Main VoiceCall component ──────────────────────────────────
export function VoiceCall({
  agentName = 'Agent',
  userPlan = 'free',
}: {
  agentName?: string
  userPlan?: string
}) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [lkToken, setLkToken] = useState<LiveKitToken | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isFree = userPlan === 'free'

  const startCall = useCallback(async () => {
    if (isFree) return
    setStatus('connecting')
    setError(null)
    try {
      const res = await fetch('/api/livekit/token')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get token')
      }
      const data: LiveKitToken = await res.json()
      setLkToken(data)
      setStatus('connected')
    } catch (err: any) {
      setError(err.message || 'Connection failed')
      setStatus('error')
    }
  }, [isFree])

  const endCall = useCallback(() => {
    setLkToken(null)
    setStatus('idle')
    setError(null)
  }, [])

  // ── Idle / upgrade state ────────────────────────────────────
  if (isFree) {
    return (
      <div className="group relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60 select-none">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Talk to {agentName}</span>
        </div>
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-popover border border-border text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 shadow-md whitespace-nowrap">
            Upgrade to Pro to use voice calling
          </div>
        </div>
      </div>
    )
  }

  // ── Connected state (LiveKit room) ──────────────────────────
  if (status === 'connected' && lkToken) {
    return (
      <div className="rounded-lg border border-[#E2725B]/30 bg-[#E2725B]/5 p-3">
        <p className="text-xs font-semibold text-[#E2725B] dark:text-[#E2725B] mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E2725B] animate-pulse inline-block" />
          Live · {agentName}
        </p>
        <LiveKitRoom
          token={lkToken.token}
          serverUrl={lkToken.url}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={endCall}
        >
          <VoiceCallInner agentName={agentName} onDisconnect={endCall} />
        </LiveKitRoom>
      </div>
    )
  }

  // ── Connecting ──────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[#E2725B]/10 text-[#E2725B] border border-[#E2725B]/20">
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        <span>Connecting…</span>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-destructive px-1">{error}</p>
        <button
          onClick={startCall}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    )
  }

  // ── Idle state ──────────────────────────────────────────────
  return (
    <button
      onClick={startCall}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[#E2725B]/10 text-[#E2725B] dark:text-[#E2725B] border border-[#E2725B]/20 hover:bg-[#E2725B]/15 hover:border-[#E2725B]/40 transition-all"
    >
      <Mic className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Talk to {agentName}</span>
    </button>
  )
}
