"use client"

import { Heart, Volume2, VolumeOff } from "lucide-react"
import { useState } from "react"
import { soundManager } from "@/lib/sounds"

interface GameHudProps {
  score: number
  lives: number
  level: number
  bossHp: { hp: number; maxHp: number } | null
  bossWarning: boolean
}

export function GameHud({ score, lives, level, bossHp, bossWarning }: GameHudProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)

  const toggleSound = () => {
    const newState = soundManager.toggle()
    setSoundEnabled(newState)
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none px-3 py-2">
      <div className="flex items-start justify-between">
        {/* Score */}
        <div>
          <p
            className="font-sans text-[8px] tracking-wider"
            style={{ color: "#00d4ff80" }}
          >
            SCORE
          </p>
          <p
            className="font-sans text-xs md:text-sm tracking-wider"
            style={{
              color: "#ffd700",
              textShadow: "0 0 8px #ffd70040",
            }}
          >
            {score.toString().padStart(8, "0")}
          </p>
        </div>

        {/* Level */}
        <div className="text-center">
          <p
            className="font-sans text-[8px] tracking-wider"
            style={{ color: "#00d4ff80" }}
          >
            LEVEL
          </p>
          <p
            className="font-sans text-xs md:text-sm tracking-wider"
            style={{
              color: "#00ff88",
              textShadow: "0 0 8px #00ff8840",
            }}
          >
            {level.toString().padStart(2, "0")}
          </p>
        </div>

        {/* Lives + Sound */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <div>
              <p
                className="font-sans text-[8px] tracking-wider"
                style={{ color: "#00d4ff80" }}
              >
                LIVES
              </p>
              <div className="flex items-center gap-1 justify-end mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    size={12}
                    className={i < lives ? "fill-current" : "opacity-20"}
                    style={{
                      color: i < lives ? "#ff2e4c" : "#ff2e4c40",
                      filter: i < lives ? "drop-shadow(0 0 4px #ff2e4c80)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={toggleSound}
              className="pointer-events-auto mt-1 p-1 transition-opacity hover:opacity-80"
              aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
            >
              {soundEnabled ? (
                <Volume2 size={14} style={{ color: "#00d4ff80" }} />
              ) : (
                <VolumeOff size={14} style={{ color: "#ff2e4c80" }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Boss HP Bar */}
      {bossHp && (
        <div className="mt-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <p
              className="font-sans text-[7px] tracking-wider animate-pulse"
              style={{ color: "#ff2e4c", textShadow: "0 0 6px #ff2e4c60" }}
            >
              BOSS
            </p>
            <div
              className="flex-1 h-2 border"
              style={{ borderColor: "#ff2e4c60", backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${(bossHp.hp / bossHp.maxHp) * 100}%`,
                  backgroundColor:
                    bossHp.hp / bossHp.maxHp > 0.5
                      ? "#ff2e4c"
                      : bossHp.hp / bossHp.maxHp > 0.25
                        ? "#ff6600"
                        : "#ffd700",
                  boxShadow: "0 0 6px currentColor",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Boss Warning */}
      {bossWarning && (
        <div className="absolute inset-x-0 top-1/3 text-center">
          <p
            className="font-sans text-sm md:text-base tracking-widest animate-pulse"
            style={{
              color: "#ff2e4c",
              textShadow: "0 0 20px #ff2e4c, 0 0 40px #ff2e4c80",
            }}
          >
            {"!! WARNING !!"}
          </p>
          <p
            className="font-sans text-[9px] tracking-wider mt-2 animate-pulse"
            style={{
              color: "#ffd700",
              textShadow: "0 0 10px #ffd70060",
            }}
          >
            BOSS APPROACHING
          </p>
        </div>
      )}
    </div>
  )
}
