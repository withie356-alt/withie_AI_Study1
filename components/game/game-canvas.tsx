"use client"

import { useState, useCallback } from "react"
import { useGameEngine } from "@/hooks/use-game-engine"
import { StartScreen } from "./start-screen"
import { GameOverScreen } from "./game-over-screen"
import { GameHud } from "./game-hud"

export function GameCanvas() {
  const {
    canvasRef,
    canvasWidth,
    canvasHeight,
    gameState,
    score,
    lives,
    level,
    highScore,
    bossHp,
    bossWarning,
    attempts,
    startGame,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getPlayHistory,
  } = useGameEngine()

  const [playerName, setPlayerName] = useState("")

  const handleStart = useCallback(
    (name: string) => {
      setPlayerName(name)
      startGame()
    },
    [startGame]
  )

  const handleRestart = useCallback(() => {
    startGame()
  }, [startGame])

  return (
    <div
      className="relative w-full max-w-[400px] mx-auto select-none"
      style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
    >
      {/* Outer glow border */}
      <div
        className="absolute -inset-[2px] rounded-sm pointer-events-none"
        style={{
          boxShadow: "0 0 20px #00d4ff20, 0 0 40px #00d4ff10",
          border: "1px solid #00d4ff30",
        }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full block rounded-sm"
        style={{ imageRendering: "pixelated", backgroundColor: "#0a0a12" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* HUD Overlay */}
      {gameState === "playing" && (
        <GameHud
          score={score}
          lives={lives}
          level={level}
          bossHp={bossHp}
          bossWarning={bossWarning}
        />
      )}

      {/* Start Screen */}
      {gameState === "start" && (
        <StartScreen onStart={handleStart} highScore={highScore} />
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <GameOverScreen
          score={score}
          level={level}
          highScore={highScore}
          playerName={playerName}
          attempts={attempts}
          playHistory={getPlayHistory()}
          onRestart={handleRestart}
        />
      )}

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none rounded-sm"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
        }}
      />
    </div>
  )
}
