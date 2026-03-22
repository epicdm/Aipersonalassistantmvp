"use client"

import { useState, useCallback, useEffect } from "react"

export function usePushSubscription() {
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "pending" | "subscribed">("pending")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushStatus("unsupported"); return }
    if (Notification.permission === "denied") { setPushStatus("denied"); return }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      setPushStatus(existing ? "subscribed" : "pending")
    }).catch(() => setPushStatus("unsupported"))
  }, [])

  const subscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return
      const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4)
      const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/")
      const rawData = window.atob(base64)
      const applicationServerKey = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) })
      setPushStatus("subscribed")
    } catch (e) { console.error("push subscribe:", e) }
  }, [])

  return { pushStatus, subscribe }
}

export function PushStatusBadge() {
  const { pushStatus, subscribe } = usePushSubscription()
  if (pushStatus === "unsupported") return null
  if (pushStatus === "subscribed") return (
    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      Push notifications enabled
    </div>
  )
  if (pushStatus === "denied") return (
    <div className="text-xs text-muted-foreground">Notifications blocked — enable in browser settings</div>
  )
  return (
    <button onClick={subscribe} className="text-xs text-indigo-500 hover:text-indigo-600 underline underline-offset-2">
      🔔 Enable push notifications for incoming calls
    </button>
  )
}