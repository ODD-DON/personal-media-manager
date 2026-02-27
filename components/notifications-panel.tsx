"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

type PermissionState = "default" | "granted" | "denied" | "unsupported"

export function NotificationsPanel() {
  const [permission, setPermission] = useState<PermissionState>("default")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PermissionState)
  }, [])

  async function requestPermission() {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not supported here.")
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result as PermissionState)
    if (result === "granted") {
      toast.success("Notifications enabled — you'll be alerted when new projects are added.")
      // Fire a quick confirmation notification
      new Notification("Notifications active", {
        body: "You'll be notified whenever a new project is queued.",
        icon: "/icon-192.png",
      })
    } else if (result === "denied") {
      toast.error("Notifications blocked. Allow them in your browser/OS settings and reload.")
    }
  }

  const statusBadge = () => {
    switch (permission) {
      case "granted":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" /> Enabled
          </Badge>
        )
      case "denied":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
            <XCircle className="h-3 w-3" /> Blocked
          </Badge>
        )
      case "unsupported":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1">
            <AlertCircle className="h-3 w-3" /> Not supported
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
            <AlertCircle className="h-3 w-3" /> Not yet enabled
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Notifications</h2>
        <p className="text-gray-600">
          Get a browser notification whenever a new project is queued — no setup required.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Status:</span>
        {statusBadge()}
      </div>

      {permission === "granted" ? (
        <div className="flex items-center gap-3 text-sm text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>You are set — notifications will fire automatically when any tab adds a new project.</span>
        </div>
      ) : permission === "denied" ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">
            Notifications are blocked by your browser. To re-enable: open your browser site settings for this page, set Notifications to Allow, then reload.
          </p>
        </div>
      ) : permission === "unsupported" ? (
        <p className="text-sm text-gray-500">
          Your browser does not support the Notification API. Try Chrome, Edge, or Firefox on desktop.
        </p>
      ) : (
        <Button onClick={requestPermission}>
          <Bell className="h-4 w-4 mr-2" />
          Enable Notifications
        </Button>
      )}

      {permission === "denied" && (
        <Button variant="outline" disabled>
          <BellOff className="h-4 w-4 mr-2" />
          Blocked by browser
        </Button>
      )}
    </div>
  )
}
