"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Bell, BellOff, Send, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_PMP_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PermissionState = "default" | "granted" | "denied" | "unsupported"

export function NotificationsPanel() {
  const [permission, setPermission] = useState<PermissionState>("default")
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [vapidMissing, setVapidMissing] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported")
      return
    }

    setPermission(Notification.permission as PermissionState)

    if (!VAPID_PUBLIC_KEY) {
      setVapidMissing(true)
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => setIsSubscribed(false))
  }, [])

  const enablePush = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported in this browser.")
      return
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error("VAPID public key is not configured. Add NEXT_PUBLIC_PMP_VAPID_PUBLIC_KEY to environment variables.")
      return
    }

    setIsEnabling(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)

      if (result !== "granted") {
        toast.error("Notification permission denied. Please allow notifications in your browser settings.")
        return
      }

      let registration = await navigator.serviceWorker.getRegistration("/sw.js")
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
      }

      const existingSub = await registration.pushManager.getSubscription()
      if (existingSub) await existingSub.unsubscribe()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { error } = await supabase.from("pmp_push_subscriptions").insert([
        {
          subscription_json: subscription.toJSON(),
          device_label: navigator.userAgent.substring(0, 100),
        },
      ])

      if (error) {
        toast.error("Failed to save subscription to database")
        return
      }

      setIsSubscribed(true)
      toast.success("Push notifications enabled successfully.")
    } catch (err: any) {
      toast.error(`Failed to enable notifications: ${err.message}`)
    } finally {
      setIsEnabling(false)
    }
  }, [])

  const sendTestNotification = useCallback(async () => {
    setIsTesting(true)
    try {
      const res = await fetch("/api/pmp/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "PMP Test Notification",
          message: "Push notifications are working correctly.",
          url: "/",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to send test notification")
        return
      }

      toast.success(`Test sent to ${data.sent} device(s)`)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsTesting(false)
    }
  }, [])

  const permissionBadge = () => {
    switch (permission) {
      case "granted":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" /> Granted
          </Badge>
        )
      case "denied":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
            <XCircle className="h-3 w-3" /> Denied
          </Badge>
        )
      case "unsupported":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 gap-1">
            <AlertCircle className="h-3 w-3" /> Not Supported
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
            <AlertCircle className="h-3 w-3" /> Not Asked
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1">Push Notifications</h2>
        <p className="text-gray-600">
          Receive push notifications when new projects are queued. On iPhone, install to Home Screen first, then enable from here.
        </p>
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Permission:</span>
          {permissionBadge()}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500">Subscribed:</span>
          {isSubscribed === null ? (
            <Badge variant="outline" className="text-gray-500">Checking...</Badge>
          ) : isSubscribed ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
              <CheckCircle className="h-3 w-3" /> Yes
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 gap-1">
              <XCircle className="h-3 w-3" /> No
            </Badge>
          )}
        </div>

        {vapidMissing && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <AlertCircle className="h-3 w-3" /> VAPID keys missing — add to Vars panel
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={permission === "granted" && isSubscribed ? "outline" : "default"}
          onClick={enablePush}
          disabled={isEnabling || permission === "denied" || permission === "unsupported"}
        >
          {isEnabling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : permission === "granted" && isSubscribed ? (
            <BellOff className="h-4 w-4 mr-2" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          {permission === "granted" && isSubscribed ? "Re-subscribe" : "Enable Push Notifications"}
        </Button>

        <Button
          variant="outline"
          onClick={sendTestNotification}
          disabled={isTesting || !isSubscribed}
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Test Notification
        </Button>
      </div>

      {permission === "denied" && (
        <p className="text-sm text-red-600">
          Notifications are blocked. Open your browser or iOS settings, allow notifications for this site, then reload.
        </p>
      )}
    </div>
  )
}
