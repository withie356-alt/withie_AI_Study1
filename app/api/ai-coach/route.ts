import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { playHistory, playerName } = await request.json()

    if (!playHistory) {
      return NextResponse.json(
        { error: "Play history required" },
        { status: 400 }
      )
    }

    const MISO_API_URL = process.env.MISO_API_URL
    const MISO_API_KEY = process.env.MISO_API_KEY

    if (!MISO_API_URL || !MISO_API_KEY) {
      console.error("[v0] Missing MISO API configuration")
      return NextResponse.json(
        { error: "AI coach service unavailable" },
        { status: 500 }
      )
    }

    // Format query with player context
    const query = `[Player: ${playerName || "Anonymous"}]\n${playHistory}`

    const response = await fetch(`${MISO_API_URL}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query,
        mode: "blocking",
        conversation_id: "",
        user: "player",
      }),
    })

    if (!response.ok) {
      console.error(`[v0] MISO API error: ${response.status}`)
      return NextResponse.json(
        { error: "Failed to get AI feedback" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const feedback = data.data?.answer || data.answer || ""

    return NextResponse.json({
      feedback,
      success: true,
    })
  } catch (error) {
    console.error("[v0] AI coach error:", error)
    return NextResponse.json(
      { error: "Failed to process AI feedback", success: false },
      { status: 500 }
    )
  }
}
