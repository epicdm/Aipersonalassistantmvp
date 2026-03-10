"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Delete,
} from "lucide-react"

// JsSIP is dynamically imported — it requires browser APIs
// This component is always rendered with { ssr: false } from the parent

type CallState = "idle" | "connecting" | "ready" | "calling" | "ringing" | "in-call" | "error"

const SIP_CONFIG = {
  server: "wss://api.bff.epic.dm:8089/ws",
  username: "softphone-user1",
  password: "BffPhone2026!",
  realm: "api.bff.epic.dm",
  displayName: "BFF Softphone",
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

export default function Softphone() {
  const [callState, setCallState] = useState<CallState>("connecting")
  const [dialInput, setDialInput] = useState("")
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [incomingCallerId, setIncomingCallerId] = useState("")
  const [statusMsg, setStatusMsg] = useState("Connecting…")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uaRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Start call duration timer ───────────────────────────────
  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Wire up remote audio stream ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachRemoteStream = useCallback((sess: any) => {
    const conn = sess.connection as RTCPeerConnection | undefined
    if (!conn) return
    conn.addEventListener("track", (e: RTCTrackEvent) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0]
        remoteAudioRef.current.play().catch(() => {/* autoplay blocked – user gesture required */})
      }
    })
  }, [])

  // ── Initialise JsSIP UA ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // Dynamic import — JsSIP must never run on the server
      const JsSIP = (await import("jssip")).default

      if (cancelled) return

      JsSIP.debug.disable("JsSIP:*")

      const socket = new JsSIP.WebSocketInterface(SIP_CONFIG.server)
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${SIP_CONFIG.username}@${SIP_CONFIG.realm}`,
        password: SIP_CONFIG.password,
        display_name: SIP_CONFIG.displayName,
        register: true,
      })

      uaRef.current = ua

      ua.on("connected", () => {
        if (!cancelled) setStatusMsg("Registering…")
      })

      ua.on("registered", () => {
        if (!cancelled) {
          setCallState("ready")
          setStatusMsg("Ready")
        }
      })

      ua.on("unregistered", () => {
        if (!cancelled) {
          setCallState("connecting")
          setStatusMsg("Unregistered — retrying…")
        }
      })

      ua.on("registrationFailed", (e: { cause: string }) => {
        if (!cancelled) {
          setCallState("error")
          setStatusMsg(`Registration failed: ${e.cause}`)
        }
      })

      ua.on("disconnected", () => {
        if (!cancelled) {
          setCallState("connecting")
          setStatusMsg("Disconnected — reconnecting…")
        }
      })

      // ── Incoming call ───────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ua.on("newRTCSession", (data: any) => {
        if (cancelled) return
        const sess = data.session
        if (data.originator === "remote") {
          // Incoming
          sessionRef.current = sess
          const callerId =
            sess.remote_identity?.display_name ||
            sess.remote_identity?.uri?.user ||
            "Unknown"
          setIncomingCallerId(callerId)
          setCallState("ringing")
          setStatusMsg(`Incoming call from ${callerId}`)

          sess.on("ended", () => {
            if (!cancelled) {
              stopTimer()
              setCallState("ready")
              setStatusMsg("Ready")
              sessionRef.current = null
            }
          })
          sess.on("failed", () => {
            if (!cancelled) {
              stopTimer()
              setCallState("ready")
              setStatusMsg("Ready")
              sessionRef.current = null
            }
          })
        }
      })

      ua.start()
    })()

    return () => {
      cancelled = true
      stopTimer()
      if (uaRef.current) {
        try { uaRef.current.stop() } catch (_) {}
        uaRef.current = null
      }
    }
  }, [stopTimer])

  // ── Dialpad press ───────────────────────────────────────────
  const pressDial = (key: string) => setDialInput(p => p + key)
  const backspace = () => setDialInput(p => p.slice(0, -1))

  // ── Make call ───────────────────────────────────────────────
  const makeCall = useCallback(() => {
    if (!uaRef.current || !dialInput.trim()) return
    const target = dialInput.trim()
    const uri = target.startsWith("sip:") ? target : `sip:${target}@${SIP_CONFIG.realm}`

    const sess = uaRef.current.call(uri, {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    })

    sessionRef.current = sess
    setCallState("calling")
    setStatusMsg(`Calling ${target}…`)

    attachRemoteStream(sess)

    sess.on("progress", () => {
      setCallState("calling")
      setStatusMsg("Ringing…")
    })

    sess.on("accepted", () => {
      setCallState("in-call")
      setStatusMsg("In call")
      startTimer()
    })

    sess.on("confirmed", () => {
      setCallState("in-call")
      setStatusMsg("In call")
    })

    sess.on("ended", () => {
      stopTimer()
      setCallState("ready")
      setStatusMsg("Ready")
      sessionRef.current = null
    })

    sess.on("failed", (e: { cause: string }) => {
      stopTimer()
      setCallState("ready")
      setStatusMsg(`Call failed: ${e.cause}`)
      sessionRef.current = null
    })
  }, [dialInput, attachRemoteStream, startTimer, stopTimer])

  // ── Hangup ──────────────────────────────────────────────────
  const hangup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate() } catch (_) {}
      sessionRef.current = null
    }
    stopTimer()
    setCallState("ready")
    setStatusMsg("Ready")
  }, [stopTimer])

  // ── Accept incoming ─────────────────────────────────────────
  const acceptCall = useCallback(() => {
    if (!sessionRef.current) return
    sessionRef.current.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    })
    attachRemoteStream(sessionRef.current)

    sessionRef.current.on("accepted", () => {
      setCallState("in-call")
      setStatusMsg("In call")
      startTimer()
    })
    sessionRef.current.on("confirmed", () => {
      setCallState("in-call")
      setStatusMsg("In call")
    })
    setCallState("in-call")
  }, [attachRemoteStream, startTimer])

  // ── Mute toggle ─────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return
    if (muted) {
      sessionRef.current.unmute({ audio: true })
    } else {
      sessionRef.current.mute({ audio: true })
    }
    setMuted(m => !m)
  }, [muted])

  // ── Status badge colour ─────────────────────────────────────
  const badgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (callState === "ready") return "default"
    if (callState === "in-call") return "default"
    if (callState === "error") return "destructive"
    return "secondary"
  }

  const badgeLabel: Record<CallState, string> = {
    idle: "Idle",
    connecting: "Connecting",
    ready: "Ready",
    calling: "Calling",
    ringing: "Ringing",
    "in-call": "In Call",
    error: "Error",
  }

  const dialKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ]

  const canCall = callState === "ready" && dialInput.trim().length > 0
  const isActive = callState === "calling" || callState === "in-call"

  return (
    <Card className="w-full max-w-sm">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Softphone</CardTitle>
          <Badge variant={badgeVariant()} className="text-xs">
            {badgeLabel[callState]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{statusMsg}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Incoming call UI ── */}
        {callState === "ringing" && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-sm font-medium">Incoming call</span>
            </div>
            <p className="text-sm text-muted-foreground">{incomingCallerId}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={acceptCall}
              >
                <Phone className="w-3.5 h-3.5 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={hangup}
              >
                <PhoneOff className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* ── In-call controls ── */}
        {callState === "in-call" && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-500">● In Call</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={muted ? "default" : "outline"}
                className="flex-1"
                onClick={toggleMute}
              >
                {muted ? <MicOff className="w-3.5 h-3.5 mr-1" /> : <Mic className="w-3.5 h-3.5 mr-1" />}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={hangup}
              >
                <PhoneOff className="w-3.5 h-3.5 mr-1" />
                Hang Up
              </Button>
            </div>
          </div>
        )}

        {/* ── Dialler (shown when idle/ready/calling) ── */}
        {callState !== "ringing" && callState !== "in-call" && (
          <>
            {/* Number input */}
            <div className="flex gap-1">
              <Input
                value={dialInput}
                onChange={e => setDialInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canCall && makeCall()}
                placeholder="Enter number…"
                className="font-mono text-sm"
                disabled={isActive}
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={backspace}
                disabled={isActive || dialInput.length === 0}
              >
                <Delete className="w-4 h-4" />
              </Button>
            </div>

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-1.5">
              {dialKeys.flat().map(k => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  className="h-10 text-sm font-medium"
                  onClick={() => pressDial(k)}
                  disabled={isActive}
                >
                  {k}
                </Button>
              ))}
            </div>

            {/* Call / Cancel button */}
            {isActive ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={hangup}
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={makeCall}
                disabled={!canCall}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            )}
          </>
        )}

        {/* ── Error state ── */}
        {callState === "error" && (
          <p className="text-xs text-destructive text-center">
            Check SIP credentials or server connectivity.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
