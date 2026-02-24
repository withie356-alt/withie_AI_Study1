import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { player_name, score, level } = body

  if (!player_name || typeof score !== "number") {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }

  const safeName = String(player_name).slice(0, 12).trim()
  if (safeName.length === 0) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if player already has entries to compute attempt count
  const { data: existing } = await supabase
    .from("leaderboard")
    .select("attempts")
    .eq("player_name", safeName)
    .order("created_at", { ascending: false })
    .limit(1)

  const attempts = existing && existing.length > 0 ? existing[0].attempts + 1 : 1

  const { data, error } = await supabase
    .from("leaderboard")
    .insert({
      player_name: safeName,
      score,
      level: level || 1,
      attempts,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
