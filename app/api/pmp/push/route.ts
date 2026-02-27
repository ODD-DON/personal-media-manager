import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Dynamically import web-push to avoid build errors if not installed yet
async function getWebPush() {
  const webpush = await import("web-push")
  return webpush.default ?? webpush
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const vapidPublic = process.env.PMP_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.PMP_VAPID_PRIVATE_KEY

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json(
        { error: "VAPID keys not configured. Add PMP_VAPID_PUBLIC_KEY and PMP_VAPID_PRIVATE_KEY to environment variables." },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { title, message, url = "/" } = body

    const webpush = await getWebPush()
    webpush.setVapidDetails(
      "mailto:admin@pmp.app",
      vapidPublic,
      vapidPrivate
    )

    const supabase = getSupabaseAdmin()
    const { data: subscriptions, error } = await supabase
      .from("pmp_push_subscriptions")
      .select("subscription_json, id")

    if (error) {
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscriptions found" })
    }

    const payload = JSON.stringify({ title, body: message, url })
    const staleIds: string[] = []
    let sent = 0

    await Promise.allSettled(
      subscriptions.map(async ({ subscription_json, id }) => {
        try {
          await webpush.sendNotification(subscription_json as any, payload)
          sent++
        } catch (err: any) {
          // 410 Gone = subscription expired/unsubscribed — remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleIds.push(id)
          }
        }
      })
    )

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await supabase.from("pmp_push_subscriptions").delete().in("id", staleIds)
    }

    return NextResponse.json({ sent, total: subscriptions.length, staleRemoved: staleIds.length })
  } catch (err: any) {
    console.error("[PMP Push] Error:", err)
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 })
  }
}
