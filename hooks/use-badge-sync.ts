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

export function useBadgeSync() {
  const syncBadge = useCallback(async () => {
    const count = await fetchPendingCount()
    applyBadge(count)
  }, [])

  useEffect(() => {
    // Sync on mount
    syncBadge()

    // Sync on window focus
    const onFocus = () => syncBadge()
    window.addEventListener("focus", onFocus)

    // Supabase Realtime subscription on pmp_projects changes
    const channel = supabase
      .channel("pmp-badge-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pmp_projects" },
        () => {
          syncBadge()
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
