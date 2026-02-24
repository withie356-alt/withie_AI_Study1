"use client"

import { useState, useEffect, useRef } from "react"

interface StartScreenProps {
  onStart: (playerName: string) => void
  highScore: number
}

export function StartScreen({ onStart, highScore }: StartScreenProps) {
  const [name, setName] = useState("")
  const [savedName, setSavedName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("rsw_player_name")
    if (stored) {
      setName(stored)
      setSavedName(stored)
    }
  }, [])

  const handleStart = () => {
    const trimmed = name.trim().slice(0, 12)
    if (trimmed.length === 0) {
      inputRef.current?.focus()
      return
    }
    sessionStorage.setItem("rsw_player_name", trimmed)
    onStart(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleStart()
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      {/* Title */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl md:text-3xl font-sans leading-relaxed tracking-wider"
          style={{
            color: "#00d4ff",
            textShadow: "0 0 20px #00d4ff80, 0 0 40px #00d4ff40",
          }}
        >
          RETRO
        </h1>
        <h1
          className="text-3xl md:text-4xl font-sans leading-relaxed tracking-wider mt-2"
          style={{
            color: "#ff2e4c",
            textShadow: "0 0 20px #ff2e4c80, 0 0 40px #ff2e4c40",
          }}
        >
          SKY WAR
        </h1>
        <p
          className="text-sm font-sans mt-4 tracking-widest"
          style={{
            color: "#ffd700",
            textShadow: "0 0 10px #ffd70060",
          }}
        >
          - 1984 -
        </p>
      </div>

      {/* Name Input */}
      <div className="mb-6 text-center">
        <label
          className="block font-sans text-[8px] tracking-wider mb-2"
          style={{ color: "#00d4ff80" }}
        >
          ENTER YOUR CALLSIGN
        </label>
        <input
          ref={inputRef}
          type="text"
          maxLength={12}
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="PILOT NAME"
          className="font-sans text-xs text-center w-48 py-2 px-3 bg-transparent border-2 outline-none transition-colors duration-200 focus:border-opacity-100 uppercase placeholder:opacity-30"
          style={{
            color: "#00d4ff",
            borderColor: "#00d4ff60",
            caretColor: "#00d4ff",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {savedName && (
          <p className="font-sans text-[7px] mt-2" style={{ color: "#00ff8880" }}>
            {"WELCOME BACK, " + savedName}
          </p>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={name.trim().length === 0}
        className="relative font-sans text-xs md:text-sm px-8 py-4 border-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          color: "#00d4ff",
          borderColor: "#00d4ff",
          backgroundColor: "rgba(0, 212, 255, 0.1)",
          textShadow: "0 0 10px #00d4ff80",
          boxShadow: "0 0 15px #00d4ff30, inset 0 0 15px #00d4ff10",
        }}
      >
        {">> START GAME <<"}
      </button>

      {/* High Score */}
      {highScore > 0 && (
        <p
          className="font-sans text-[10px] mt-6 tracking-wider"
          style={{ color: "#ffd700" }}
        >
          {"HIGH SCORE: " + highScore.toString().padStart(8, "0")}
        </p>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center space-y-2">
        <p className="font-sans text-[8px] md:text-[9px]" style={{ color: "#00d4ff80" }}>
          {"KEYBOARD: ARROWS + SPACE"}
        </p>
        <p className="font-sans text-[8px] md:text-[9px]" style={{ color: "#00d4ff80" }}>
          {"MOBILE: TOUCH & DRAG"}
        </p>
        <p className="font-sans text-[7px] mt-2" style={{ color: "#ff2e4c80" }}>
          {"BOSS APPEARS EVERY 3 LEVELS"}
        </p>
      </div>
    </div>
  )
}
