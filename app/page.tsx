import { GameCanvas } from "@/components/game/game-canvas"

export default function Home() {
  return (
    <main
      className="min-h-svh flex items-center justify-center p-4"
      style={{ backgroundColor: "#06060c" }}
    >
      <GameCanvas />
    </main>
  )
}
