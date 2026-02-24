"use client"

import { useState, useEffect, useCallback } from "react"
import { Trophy } from "lucide-react"

interface LeaderboardEntry {
  id: number
  player_name: string
  score: number
  level: number
  attempts: number
  created_at: string
}

interface GameOverScreenProps {
  score: number
  level: number
  highScore: number
  playerName: string
  attempts: number
  playHistory: string
  onRestart: () => void
}

export function GameOverScreen({
  score,
  level,
  highScore,
  playerName,
  attempts,
  playHistory,
  onRestart,
}: GameOverScreenProps) {
  const isNewHighScore = score >= highScore && score > 0
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const submitScore = useCallback(async () => {
    if (submitted || score === 0) return
    setLoading(true)
    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          score,
          level,
        }),
      })
      setSubmitted(true)
    } catch {
      // silent fail
    }
    setLoading(false)
  }, [submitted, score, playerName, level])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard")
      const data = await res.json()
      if (Array.isArray(data)) setLeaderboard(data)
    } catch {
      // silent fail
    }
  }, [])

  const fetchAiCoachFeedback = useCallback(async () => {
    if (!playHistory) return
    setFeedbackLoading(true)
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playHistory,
          playerName,
        }),
      })
      const data = await res.json()
      if (data.feedback) {
        setAiFeedback(data.feedback)
      }
    } catch (err) {
      console.error("[v0] Failed to fetch AI feedback:", err)
    }
    setFeedbackLoading(false)
  }, [playHistory, playerName])

  useEffect(() => {
    submitScore().then(() => {
      fetchLeaderboard().then(() => {
        setShowBoard(true)
        fetchAiCoachFeedback()
      })
    })
  }, [submitScore, fetchLeaderboard, fetchAiCoachFeedback])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto overflow-y-auto">
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 text-center px-4 py-6 w-full max-w-[360px]">
        {/* Game Over Title */}
        <h2
          className="text-2xl md:text-3xl font-sans tracking-wider animate-pulse"
          style={{
            color: "#ff2e4c",
            textShadow: "0 0 20px #ff2e4c80, 0 0 40px #ff2e4c40",
          }}
        >
          GAME OVER
        </h2>

        {/* Score Info */}
        <div className="mt-5 space-y-2">
          <p className="font-sans text-[8px] tracking-wider" style={{ color: "#00d4ff80" }}>
            {playerName + " / LEVEL " + level + " / ATTEMPT #" + attempts}
          </p>
          <p className="font-sans text-[10px] tracking-wider" style={{ color: "#00d4ff80" }}>
            FINAL SCORE
          </p>
          <p
            className="font-sans text-xl md:text-2xl tracking-wider"
            style={{
              color: "#ffd700",
              textShadow: "0 0 15px #ffd70060",
            }}
          >
            {score.toString().padStart(8, "0")}
          </p>

          {isNewHighScore && (
            <p
              className="font-sans text-[10px] tracking-wider animate-pulse"
              style={{
                color: "#00ff88",
                textShadow: "0 0 10px #00ff8860",
              }}
            >
              {"** NEW HIGH SCORE! **"}
            </p>
          )}
        </div>

        {/* Leaderboard */}
        {showBoard && leaderboard.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy size={12} style={{ color: "#ffd700" }} />
              <p className="font-sans text-[9px] tracking-wider" style={{ color: "#ffd700" }}>
                TOP PILOTS
              </p>
              <Trophy size={12} style={{ color: "#ffd700" }} />
            </div>
            <div
              className="border p-2"
              style={{ borderColor: "#00d4ff30", backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
              {/* Header */}
              <div
                className="flex items-center py-1 border-b mb-1"
                style={{ borderColor: "#00d4ff20" }}
              >
                <span
                  className="font-sans text-[7px] w-6 text-center"
                  style={{ color: "#00d4ff60" }}
                >
                  #
                </span>
                <span
                  className="font-sans text-[7px] flex-1 text-left"
                  style={{ color: "#00d4ff60" }}
                >
                  NAME
                </span>
                <span
                  className="font-sans text-[7px] w-16 text-right"
                  style={{ color: "#00d4ff60" }}
                >
                  SCORE
                </span>
                <span
                  className="font-sans text-[7px] w-8 text-right"
                  style={{ color: "#00d4ff60" }}
                >
                  LV
                </span>
              </div>
              {/* Rows */}
              {leaderboard.map((entry, i) => {
                const isMe = entry.player_name === playerName && entry.score === score
                const rankColor =
                  i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#00d4ff80"
                return (
                  <div
                    key={entry.id}
                    className="flex items-center py-[3px]"
                    style={{
                      backgroundColor: isMe ? "rgba(0, 212, 255, 0.08)" : "transparent",
                    }}
                  >
                    <span
                      className="font-sans text-[7px] w-6 text-center"
                      style={{ color: rankColor }}
                    >
                      {(i + 1).toString()}
                    </span>
                    <span
                      className="font-sans text-[7px] flex-1 text-left truncate"
                      style={{ color: isMe ? "#00d4ff" : "#00d4ffa0" }}
                    >
                      {entry.player_name}
                    </span>
                    <span
                      className="font-sans text-[7px] w-16 text-right"
                      style={{ color: isMe ? "#ffd700" : "#ffd700a0" }}
                    >
                      {entry.score.toLocaleString()}
                    </span>
                    <span
                      className="font-sans text-[7px] w-8 text-right"
                      style={{ color: "#00ff8880" }}
                    >
                      {entry.level}
                    </span>
                  </div>
                )
              })}
            </div>
            {loading && (
              <p className="font-sans text-[7px] mt-2 animate-pulse" style={{ color: "#00d4ff60" }}>
                SAVING...
              </p>
            )}
          </div>
        )}

        {/* AI Coach Feedback */}
        {(aiFeedback || feedbackLoading) && (
          <div
            className="mt-6 p-3 rounded-sm text-left max-h-[180px] overflow-y-auto"
            style={{
              backgroundColor: "rgba(0, 255, 136, 0.05)",
              border: "1px solid rgba(0, 255, 136, 0.3)",
            }}
          >
            <p
              className="font-sans text-[7px] font-bold mb-2 tracking-wider"
              style={{ color: "#00ff88" }}
            >
              {feedbackLoading ? "AI COACH ANALYZING..." : "⚡ AI COACH FEEDBACK ⚡"}
            </p>
            {feedbackLoading ? (
              <div className="font-sans text-[7px] animate-pulse" style={{ color: "#00ff8880" }}>
                Processing game data...
              </div>
            ) : (
              <p
                className="font-sans text-[7px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "#00ff88cc" }}
              >
                {aiFeedback}
              </p>
            )}
          </div>
        )}

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="mt-6 font-sans text-xs px-8 py-4 border-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            color: "#00d4ff",
            borderColor: "#00d4ff",
            backgroundColor: "rgba(0, 212, 255, 0.1)",
            textShadow: "0 0 10px #00d4ff80",
            boxShadow: "0 0 15px #00d4ff30, inset 0 0 15px #00d4ff10",
          }}
        >
          {">> RESTART <<"}
        </button>
      </div>
    </div>
  )
}
