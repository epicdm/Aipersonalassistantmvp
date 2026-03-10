"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"

// react-softphone bundles MUI — must be client-only, no SSR
const SoftPhone = dynamic(() => import("react-softphone"), { ssr: false })

const sipConfig = {
  domain: "api.bff.epic.dm",
  uri: "sip:softphone-user1@api.bff.epic.dm",
  password: "BffPhone2026!",
  ws_servers: "wss://api.bff.epic.dm:8089/ws",
  display_name: "EPIC AI Phone",
  debug: true,
  session_timers_refresh_method: "invite",
}

// ── Push notification subscription hook ──────────────────────────────────────
function usePushSubscription() {
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "pending" | "subscribed">("pending")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setPushStatus("denied")
      return
    }

    // Register service worker
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        setPushStatus("subscribed")
        return
      }
      setPushStatus("pending")
    }).catch(() => setPushStatus("unsupported"))
  }, [])

  const subscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
      setPushStatus("subscribed")
    } catch (e) {
      console.error("push subscribe:", e)
    }
  }, [])

  return { pushStatus, subscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// ── Push status badge ─────────────────────────────────────────────────────────
function PushStatusBadge() {
  const { pushStatus, subscribe } = usePushSubscription()

  if (pushStatus === "unsupported") return null

  if (pushStatus === "subscribed") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Push notifications enabled
      </div>
    )
  }

  if (pushStatus === "denied") {
    return (
      <div className="text-xs text-muted-foreground">
        Notifications blocked — enable in browser settings to receive call alerts
      </div>
    )
  }

  return (
    <button
      onClick={subscribe}
      className="text-xs text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
    >
      🔔 Enable push notifications for incoming calls
    </button>
  )
}

// ── Main Dialpad component ────────────────────────────────────────────────────
export default function Dialpad() {
  const [open, setOpen] = useState(true)
  const [callVolume, setCallVolume] = useState(0.8)
  const [ringVolume, setRingVolume] = useState(0.6)
  const [notifications, setNotifications] = useState(true)
  const [connectOnStart, setConnectOnStart] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* Push notification status */}
      <div className="px-1">
        <PushStatusBadge />
      </div>

      {/* react-softphone — handles all UI: dialpad, in-call controls, history */}
      <SoftPhone
        softPhoneOpen={open}
        setSoftPhoneOpen={setOpen}
        callVolume={callVolume}
        ringVolume={ringVolume}
        connectOnStart={connectOnStart}
        notifications={notifications}
        config={sipConfig}
        setConnectOnStartToLocalStorage={(v: boolean) => {
          setConnectOnStart(v)
          localStorage.setItem("softphone-connect-on-start", String(v))
        }}
        setNotifications={(v: boolean) => {
          setNotifications(v)
          localStorage.setItem("softphone-notifications", String(v))
        }}
        setCallVolume={(v: number) => {
          setCallVolume(v)
          localStorage.setItem("softphone-call-volume", String(v))
        }}
        setRingVolume={(v: number) => {
          setRingVolume(v)
          localStorage.setItem("softphone-ring-volume", String(v))
        }}
        builtInLauncher={false}
        asteriskAccounts={[]}
        timelocale="UTC"
      />
    </div>
  )
}
