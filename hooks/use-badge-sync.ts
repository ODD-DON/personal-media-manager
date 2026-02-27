"use client"

import { useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

async function fetchPendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from("pmp_projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending")
  if (error) return 0
  return count ?? 0
}

function applyBadge(count: number) {
  if (typeof navigator === "undefined") return
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      ;(navigator as any).setAppBadge(count).catch(() => {})
    } else {
      ;(navigator as any).clearAppBadge().catch(() => {})
    }
  }
}

function fireNotification(title: string, body: string) {
  if (typeof window === "undefined") return
  if (!("Notification" in window)) return
  if (Notification.permission !== "granted") return
  // Don't notify the tab that triggered the insert — only background tabs
  if (document.visibilityState === "visible") return
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
    })
  } catch {
    // Notifications blocked or unsupported — silently ignore
  }
}

export function useBadgeSync() {
  const syncBadge = useCallback(async () => {
    const count = await fetchPendingCount()
    applyBadge(count)
  }, [])

  useEffect(() => {
    syncBadge()

    const onFocus = () => syncBadge()
    window.addEventListener("focus", onFocus)

    const channel = supabase
      .channel("pmp-badge-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pmp_projects" },
        (payload) => {
          syncBadge()

          // Fire a native browser notification for new inserts
          if (payload.eventType === "INSERT") {
            const title = (payload.new as any)?.title ?? "New project queued"
            fireNotification("New project queued", title)
          }
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channel)
    }
  }, [syncBadge])

  return { syncBadge }
}
