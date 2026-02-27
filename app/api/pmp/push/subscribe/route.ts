import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Upsert by endpoint so re-subscribing doesn't create duplicates
    const { error } = await supabase
      .from("pmp_push_subscriptions")
      .upsert(
        { subscription_json: subscription, endpoint: subscription.endpoint },
        { onConflict: "endpoint" }
      )

    if (error) {
      console.error("[PMP Subscribe] Supabase error:", error)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[PMP Subscribe] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
