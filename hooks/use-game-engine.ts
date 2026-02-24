"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { soundManager } from "@/lib/sounds"
import { playHistoryRecorder } from "@/lib/play-history"

// ─── Types ───────────────────────────────────────────────────────────────────
export type GameState = "start" | "playing" | "gameover"

export interface Position {
  x: number
  y: number
}

export interface Player extends Position {
  width: number
  height: number
  speed: number
  lives: number
  invincible: boolean
  invincibleTimer: number
}

export type EnemyType = "basic" | "fast" | "large" | "boss"

export interface Enemy extends Position {
  width: number
  height: number
  speed: number
  type: EnemyType
  hp: number
  maxHp: number
  // Boss specifics
  phase?: number
  shootTimer?: number
  moveDir?: number
}

export interface Bullet extends Position {
  width: number
  height: number
  speed: number
  isEnemy?: boolean
}

export interface Particle extends Position {
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface Star extends Position {
  speed: number
  size: number
  brightness: number
}

export interface ScreenShake {
  intensity: number
  duration: number
}

export interface GameData {
  state: GameState
  score: number
  level: number
  player: Player
  enemies: Enemy[]
  bullets: Bullet[]
  particles: Particle[]
  stars: Star[]
  highScore: number
  bossActive: boolean
  bossWarningTimer: number
  screenShake: ScreenShake
  totalAttempts: number
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 700
const PLAYER_WIDTH = 32
const PLAYER_HEIGHT = 32
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 12
const BULLET_SPEED = 8
const FIRE_RATE = 150
const INVINCIBLE_DURATION = 120
const LEVEL_UP_SCORE = 1000
const BOSS_EVERY_N_LEVELS = 3

const ENEMY_DEFS: Record<
  EnemyType,
  { width: number; height: number; speed: number; hp: number; score: number }
> = {
  basic: { width: 28, height: 28, speed: 2, hp: 1, score: 100 },
  fast: { width: 22, height: 22, speed: 4, hp: 1, score: 150 },
  large: { width: 40, height: 40, speed: 1.2, hp: 3, score: 300 },
  boss: { width: 64, height: 64, speed: 0.8, hp: 30, score: 2000 },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    speed: 0.3 + Math.random() * 1.5,
    size: Math.random() < 0.3 ? 2 : 1,
    brightness: 0.3 + Math.random() * 0.7,
  }))
}

function spawnEnemy(level: number): Enemy {
  const types: EnemyType[] = ["basic", "basic", "basic"]
  if (level >= 2) types.push("fast", "fast")
  if (level >= 3) types.push("large")
  const type = types[Math.floor(Math.random() * types.length)]
  const def = ENEMY_DEFS[type]
  return {
    x: def.width / 2 + Math.random() * (CANVAS_WIDTH - def.width),
    y: -def.height,
    width: def.width,
    height: def.height,
    speed: def.speed + level * 0.15,
    type,
    hp: def.hp,
    maxHp: def.hp,
  }
}

function spawnBoss(level: number): Enemy {
  const baseHp = 30 + level * 10
  return {
    x: CANVAS_WIDTH / 2,
    y: -80,
    width: 64,
    height: 64,
    speed: 0.8,
    type: "boss",
    hp: baseHp,
    maxHp: baseHp,
    phase: 0,
    shootTimer: 0,
    moveDir: 1,
  }
}

function createExplosion(x: number, y: number, color: string, count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 1 + Math.random() * 3,
    }
  })
}

function createBigExplosion(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  const colors = ["#ff2e4c", "#ffd700", "#ff6600", "#ffffff", "#00d4ff"]
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (1 + ring * 2) + Math.random() * 3
      particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 30 + ring * 10,
        maxLife: 80,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
      })
    }
  }
  return particles
}

function aabb(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameData>({
    state: "start",
    score: 0,
    level: 1,
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 80,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: 5,
      lives: 3,
      invincible: false,
      invincibleTimer: 0,
    },
    enemies: [],
    bullets: [],
    particles: [],
    stars: createStars(80),
    highScore: 0,
    bossActive: false,
    bossWarningTimer: 0,
    screenShake: { intensity: 0, duration: 0 },
    totalAttempts: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())
  const lastFireRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const rafRef = useRef<number>(0)
  const mouseRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
  })
  const prevLevelRef = useRef(1)
  const bossSpawnedForLevelRef = useRef<Set<number>>(new Set())

  const [displayState, setDisplayState] = useState<GameState>("start")
  const [displayScore, setDisplayScore] = useState(0)
  const [displayLives, setDisplayLives] = useState(3)
  const [displayLevel, setDisplayLevel] = useState(1)
  const [displayHighScore, setDisplayHighScore] = useState(0)
  const [displayBossHp, setDisplayBossHp] = useState<{ hp: number; maxHp: number } | null>(null)
  const [displayBossWarning, setDisplayBossWarning] = useState(false)
  const [attempts, setAttempts] = useState(0)

  // ─── Drawing ─────────────────────────────────────────────────────────
  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, p: Player) => {
    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) return

    ctx.save()
    ctx.translate(p.x, p.y)

    const glowGrad = ctx.createRadialGradient(0, 16, 0, 0, 16, 20)
    glowGrad.addColorStop(0, "rgba(0, 212, 255, 0.6)")
    glowGrad.addColorStop(1, "rgba(0, 212, 255, 0)")
    ctx.fillStyle = glowGrad
    ctx.fillRect(-12, 8, 24, 24)

    ctx.fillStyle = "#00d4ff"
    ctx.beginPath()
    ctx.moveTo(0, -16)
    ctx.lineTo(-14, 14)
    ctx.lineTo(-6, 10)
    ctx.lineTo(0, 16)
    ctx.lineTo(6, 10)
    ctx.lineTo(14, 14)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = "#80eeff"
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.ellipse(0, -4, 3, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#0099cc"
    ctx.fillRect(-16, 4, 6, 3)
    ctx.fillRect(10, 4, 6, 3)

    ctx.restore()
  }, [])

  const drawEnemy = useCallback((ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.save()
    ctx.translate(e.x, e.y)

    if (e.type === "basic") {
      ctx.fillStyle = "#ff2e4c"
      ctx.beginPath()
      ctx.moveTo(0, -12)
      ctx.lineTo(-12, 8)
      ctx.lineTo(-4, 4)
      ctx.lineTo(0, 12)
      ctx.lineTo(4, 4)
      ctx.lineTo(12, 8)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#ff6080"
      ctx.lineWidth = 1
      ctx.stroke()
    } else if (e.type === "fast") {
      ctx.fillStyle = "#ffd700"
      ctx.beginPath()
      ctx.moveTo(0, -10)
      ctx.lineTo(-10, 6)
      ctx.lineTo(0, 2)
      ctx.lineTo(10, 6)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#ffe060"
      ctx.lineWidth = 1
      ctx.stroke()
    } else if (e.type === "large") {
      ctx.fillStyle = "#ff2e4c"
      ctx.fillRect(-18, -18, 36, 36)
      ctx.strokeStyle = "#ff6080"
      ctx.lineWidth = 2
      ctx.strokeRect(-18, -18, 36, 36)
      ctx.fillStyle = "#ff6080"
      ctx.fillRect(-12, -12, 8, 8)
      ctx.fillRect(4, -12, 8, 8)
      ctx.fillRect(-4, 4, 8, 8)
    } else if (e.type === "boss") {
      // Boss body - hexagonal core
      const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.85
      ctx.save()
      ctx.scale(pulse, pulse)

      // Outer hull
      ctx.fillStyle = "#8b0000"
      ctx.beginPath()
      ctx.moveTo(0, -30)
      ctx.lineTo(-28, -14)
      ctx.lineTo(-28, 14)
      ctx.lineTo(0, 30)
      ctx.lineTo(28, 14)
      ctx.lineTo(28, -14)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#ff2e4c"
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner core
      ctx.fillStyle = "#ff2e4c"
      ctx.beginPath()
      ctx.moveTo(0, -18)
      ctx.lineTo(-16, -8)
      ctx.lineTo(-16, 8)
      ctx.lineTo(0, 18)
      ctx.lineTo(16, 8)
      ctx.lineTo(16, -8)
      ctx.closePath()
      ctx.fill()

      // Glowing eye
      const eyePulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7
      const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12)
      eyeGrad.addColorStop(0, `rgba(255, 215, 0, ${eyePulse})`)
      eyeGrad.addColorStop(0.5, `rgba(255, 100, 0, ${eyePulse * 0.6})`)
      eyeGrad.addColorStop(1, "rgba(255, 0, 0, 0)")
      ctx.fillStyle = eyeGrad
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fill()

      // Eye pupil
      ctx.fillStyle = "#ffd700"
      ctx.beginPath()
      ctx.arc(0, 0, 4, 0, Math.PI * 2)
      ctx.fill()

      // Wing cannons
      ctx.fillStyle = "#660000"
      ctx.fillRect(-34, -8, 8, 16)
      ctx.fillRect(26, -8, 8, 16)
      ctx.strokeStyle = "#ff4060"
      ctx.lineWidth = 1
      ctx.strokeRect(-34, -8, 8, 16)
      ctx.strokeRect(26, -8, 8, 16)

      ctx.restore()

      // HP bar background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(-30, -40, 60, 6)
      // HP bar fill
      const hpPct = e.hp / e.maxHp
      const barColor = hpPct > 0.5 ? "#ff2e4c" : hpPct > 0.25 ? "#ff6600" : "#ffd700"
      ctx.fillStyle = barColor
      ctx.fillRect(-29, -39, 58 * hpPct, 4)
      ctx.strokeStyle = "#ff608040"
      ctx.lineWidth = 1
      ctx.strokeRect(-30, -40, 60, 6)
    }

    ctx.restore()
  }, [])

  const drawBullet = useCallback((ctx: CanvasRenderingContext2D, b: Bullet) => {
    ctx.save()
    if (b.isEnemy) {
      // Enemy bullets: red/orange
      const grad = ctx.createLinearGradient(b.x, b.y - 4, b.x, b.y + 4)
      grad.addColorStop(0, "#ff6600")
      grad.addColorStop(1, "#ff2e4c")
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ffd700"
      ctx.beginPath()
      ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const grad = ctx.createLinearGradient(b.x, b.y - 6, b.x, b.y + 6)
      grad.addColorStop(0, "#00ff88")
      grad.addColorStop(1, "#00d4ff")
      ctx.fillStyle = grad
      ctx.fillRect(b.x - 2, b.y - 6, 4, 12)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(b.x - 1, b.y - 4, 2, 8)
    }
    ctx.restore()
  }, [])

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    ctx.globalAlpha = 1
  }, [])

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, stars: Star[]) => {
    for (const s of stars) {
      ctx.globalAlpha = s.brightness
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    ctx.globalAlpha = 1
  }, [])

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, offset: number) => {
      ctx.strokeStyle = "rgba(0, 212, 255, 0.05)"
      ctx.lineWidth = 1
      const spacing = 40
      for (let x = 0; x < CANVAS_WIDTH; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, CANVAS_HEIGHT)
        ctx.stroke()
      }
      for (let y = offset % spacing; y < CANVAS_HEIGHT; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CANVAS_WIDTH, y)
        ctx.stroke()
      }
    },
    []
  )

  // ─── Main Loop ───────────────────────────────────────────────────────
  const gridOffsetRef = useRef(0)

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const game = gameRef.current
    const keys = keysRef.current
    const now = performance.now()

    // Screen shake offset
    let shakeX = 0
    let shakeY = 0
    if (game.screenShake.duration > 0) {
      game.screenShake.duration--
      shakeX = (Math.random() - 0.5) * game.screenShake.intensity * 2
      shakeY = (Math.random() - 0.5) * game.screenShake.intensity * 2
      game.screenShake.intensity *= 0.95
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    // ── Clear ──
    ctx.fillStyle = "#0a0a12"
    ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20)

    // ── Stars ──
    for (const s of game.stars) {
      s.y += s.speed
      if (s.y > CANVAS_HEIGHT) {
        s.y = -2
        s.x = Math.random() * CANVAS_WIDTH
      }
    }
    drawStars(ctx, game.stars)

    // ── Grid ──
    gridOffsetRef.current += 1
    drawGrid(ctx, gridOffsetRef.current)

    // ── Boss Warning ──
    if (game.bossWarningTimer > 0) {
      game.bossWarningTimer--
      const alpha = Math.sin(game.bossWarningTimer * 0.15) * 0.3 + 0.3
      ctx.fillStyle = `rgba(255, 46, 76, ${alpha})`
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      setDisplayBossWarning(game.bossWarningTimer > 0)
    }

    if (game.state === "playing") {
      const p = game.player

      // ── Player Movement ──
      if (mouseRef.current.active) {
        const dx = mouseRef.current.x - p.x
        const dy = mouseRef.current.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 2) {
          p.x += (dx / dist) * Math.min(dist, p.speed + 2)
          p.y += (dy / dist) * Math.min(dist, p.speed + 2)
        }
      } else {
        if (keys.has("ArrowLeft") || keys.has("a")) p.x -= p.speed
        if (keys.has("ArrowRight") || keys.has("d")) p.x += p.speed
        if (keys.has("ArrowUp") || keys.has("w")) p.y -= p.speed
        if (keys.has("ArrowDown") || keys.has("s")) p.y += p.speed
      }

      p.x = Math.max(p.width / 2, Math.min(CANVAS_WIDTH - p.width / 2, p.x))
      p.y = Math.max(CANVAS_HEIGHT * 0.3, Math.min(CANVAS_HEIGHT - p.height / 2, p.y))

      // ── Fire ──
      const shouldFire = mouseRef.current.active || keys.has(" ") || keys.has("Space")
      if (shouldFire && now - lastFireRef.current > FIRE_RATE) {
        game.bullets.push({
          x: p.x,
          y: p.y - p.height / 2,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          speed: BULLET_SPEED,
        })
        soundManager.shoot()
        playHistoryRecorder.recordAction("shoot")
        lastFireRef.current = now
      }

      // ── Update Player Bullets ──
      game.bullets = game.bullets.filter((b) => {
        if (b.isEnemy) {
          b.y += b.speed
          return b.y - b.height < CANVAS_HEIGHT + 10
        }
        b.y -= b.speed
        return b.y + b.height > 0
      })

      // ── Level Up check ──
      const newLevel = Math.floor(game.score / LEVEL_UP_SCORE) + 1
      if (newLevel > game.level) {
        game.level = newLevel
        soundManager.levelUp()
        playHistoryRecorder.recordAction("level_up", { level: newLevel })

        // Check boss spawn
        if (newLevel % BOSS_EVERY_N_LEVELS === 0 && !bossSpawnedForLevelRef.current.has(newLevel)) {
          bossSpawnedForLevelRef.current.add(newLevel)
          game.bossWarningTimer = 90 // ~1.5s warning
          game.bossActive = true
          soundManager.bossWarning()
          playHistoryRecorder.recordAction("boss_spawn", { bossPhase: newLevel })
          // Delay boss spawn
          setTimeout(() => {
            if (gameRef.current.state === "playing") {
              gameRef.current.enemies.push(spawnBoss(newLevel))
            }
          }, 1500)
        }
      }
      prevLevelRef.current = game.level

      // ── Spawn Enemies ──
      if (!game.bossActive || game.bossWarningTimer <= 0) {
        spawnTimerRef.current++
        const spawnRate = Math.max(20, 60 - game.level * 5)
        // Reduce spawn rate when boss is active
        const effectiveRate = game.bossActive ? spawnRate * 2.5 : spawnRate
        if (spawnTimerRef.current >= effectiveRate) {
          game.enemies.push(spawnEnemy(game.level))
          spawnTimerRef.current = 0
        }
      }

      // ── Update Enemies & Boss AI ──
      game.enemies = game.enemies.filter((e) => {
        if (e.type === "boss") {
          // Boss movement pattern: drift down then move horizontally
          if (e.y < 80) {
            e.y += e.speed
          } else {
            e.x += (e.moveDir || 1) * 1.5
            if (e.x > CANVAS_WIDTH - 40) e.moveDir = -1
            if (e.x < 40) e.moveDir = 1
            // Slight vertical bobbing
            e.y = 80 + Math.sin(Date.now() * 0.002) * 15
          }

          // Boss shooting
          e.shootTimer = (e.shootTimer || 0) + 1
          const shootInterval = e.hp < e.maxHp * 0.3 ? 15 : 30
          if (e.shootTimer >= shootInterval && e.y > 40) {
            e.shootTimer = 0
            // Spread pattern based on HP
            if (e.hp < e.maxHp * 0.5) {
              // 3-way spread
              for (let angle = -0.3; angle <= 0.3; angle += 0.3) {
                game.bullets.push({
                  x: e.x + Math.sin(angle) * 10,
                  y: e.y + 30,
                  width: 6,
                  height: 6,
                  speed: 3 + Math.abs(angle),
                  isEnemy: true,
                })
              }
            } else {
              // Single shot aimed at player
              game.bullets.push({
                x: e.x,
                y: e.y + 30,
                width: 6,
                height: 6,
                speed: 3.5,
                isEnemy: true,
              })
            }
          }
          return true // Boss doesn't leave screen
        }

        e.y += e.speed
        return e.y - e.height < CANVAS_HEIGHT + 40
      })

      // ── Collision: Player Bullets ↔ Enemies ──
      const bulletsToRemove = new Set<number>()
      const enemiesToRemove = new Set<number>()

      for (let bi = 0; bi < game.bullets.length; bi++) {
        const b = game.bullets[bi]
        if (b.isEnemy) continue
        for (let ei = 0; ei < game.enemies.length; ei++) {
          if (enemiesToRemove.has(ei)) continue
          if (aabb(b, game.enemies[ei])) {
            bulletsToRemove.add(bi)
            game.enemies[ei].hp--
            if (game.enemies[ei].hp <= 0) {
              enemiesToRemove.add(ei)
              const e = game.enemies[ei]
              const scoreVal = ENEMY_DEFS[e.type].score
              game.score += scoreVal
              playHistoryRecorder.recordAction("kill", {
                enemyType: e.type,
                score: scoreVal,
              })

              if (e.type === "boss") {
                game.particles.push(...createBigExplosion(e.x, e.y))
                game.screenShake = { intensity: 12, duration: 30 }
                game.bossActive = false
                soundManager.bossExplode()
                setDisplayBossHp(null)
              } else {
                game.particles.push(
                  ...createExplosion(e.x, e.y, e.type === "fast" ? "#ffd700" : "#ff2e4c", 12)
                )
                soundManager.explode()
              }
            } else {
              game.particles.push(
                ...createExplosion(b.x, b.y, "#ffffff", 4)
              )
              // Update boss HP display
              if (game.enemies[ei].type === "boss") {
                setDisplayBossHp({ hp: game.enemies[ei].hp, maxHp: game.enemies[ei].maxHp })
              }
            }
          }
        }
      }
      game.bullets = game.bullets.filter((_, i) => !bulletsToRemove.has(i))
      game.enemies = game.enemies.filter((_, i) => !enemiesToRemove.has(i))

      // ── Collision: Enemy Bullets ↔ Player ──
      if (!p.invincible) {
        for (let i = game.bullets.length - 1; i >= 0; i--) {
          const b = game.bullets[i]
          if (!b.isEnemy) continue
          if (aabb(p, b)) {
            game.bullets.splice(i, 1)
            game.particles.push(...createExplosion(p.x, p.y, "#ff6600", 8))
            soundManager.hit()
            playHistoryRecorder.recordAction("hit")
            p.lives--
            if (p.lives <= 0) {
              game.particles.push(...createBigExplosion(p.x, p.y))
              game.screenShake = { intensity: 8, duration: 20 }
              game.state = "gameover"
              if (game.score > game.highScore) game.highScore = game.score
              soundManager.gameOver()
              setDisplayState("gameover")
              setDisplayHighScore(game.highScore)
              setDisplayBossHp(null)
            } else {
              p.invincible = true
              p.invincibleTimer = INVINCIBLE_DURATION
              game.screenShake = { intensity: 4, duration: 10 }
            }
            break
          }
        }
      }

      // ── Collision: Enemies ↔ Player ──
      if (!p.invincible && game.state === "playing") {
        for (let i = game.enemies.length - 1; i >= 0; i--) {
          if (game.enemies[i].type === "boss") continue // Boss doesn't collide directly
          if (aabb(p, game.enemies[i])) {
            game.particles.push(
              ...createExplosion(game.enemies[i].x, game.enemies[i].y, "#ff2e4c", 15)
            )
            soundManager.hit()
            playHistoryRecorder.recordAction("hit")
            game.enemies.splice(i, 1)
            p.lives--
            if (p.lives <= 0) {
              game.particles.push(...createBigExplosion(p.x, p.y))
              game.screenShake = { intensity: 8, duration: 20 }
              game.state = "gameover"
              if (game.score > game.highScore) game.highScore = game.score
              soundManager.gameOver()
              setDisplayState("gameover")
              setDisplayHighScore(game.highScore)
              setDisplayBossHp(null)
            } else {
              p.invincible = true
              p.invincibleTimer = INVINCIBLE_DURATION
              game.screenShake = { intensity: 4, duration: 10 }
            }
          }
        }
      }

      // ── Invincibility ──
      if (p.invincible) {
        p.invincibleTimer--
        if (p.invincibleTimer <= 0) p.invincible = false
      }

      // ── Update Particles ──
      game.particles = game.particles.filter((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.vx *= 0.98
        pt.vy *= 0.98
        pt.life--
        return pt.life > 0
      })

      // ── Draw ──
      for (const b of game.bullets) drawBullet(ctx, b)
      for (const e of game.enemies) drawEnemy(ctx, e)
      drawPlayer(ctx, p)
      for (const pt of game.particles) drawParticle(ctx, pt)

      // ── Update display ──
      setDisplayScore(game.score)
      setDisplayLives(p.lives)
      setDisplayLevel(game.level)
    }

    if (game.state === "gameover") {
      game.particles = game.particles.filter((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.vx *= 0.98
        pt.vy *= 0.98
        pt.life--
        return pt.life > 0
      })
      for (const pt of game.particles) drawParticle(ctx, pt)
    }

    ctx.restore()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [drawBullet, drawEnemy, drawGrid, drawParticle, drawPlayer, drawStars])

  // ─── Start / Restart ─────────────────────────────────────────────────
  const startGame = useCallback(() => {
    playHistoryRecorder.reset()
    const game = gameRef.current
    game.state = "playing"
    game.score = 0
    game.level = 1
    game.player = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 80,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: 5,
      lives: 3,
      invincible: false,
      invincibleTimer: 0,
    }
    game.enemies = []
    game.bullets = []
    game.particles = []
    game.bossActive = false
    game.bossWarningTimer = 0
    game.screenShake = { intensity: 0, duration: 0 }
    game.totalAttempts++
    spawnTimerRef.current = 0
    prevLevelRef.current = 1
    bossSpawnedForLevelRef.current.clear()
    mouseRef.current.active = false

    setDisplayState("playing")
    setDisplayScore(0)
    setDisplayLives(3)
    setDisplayLevel(1)
    setDisplayBossHp(null)
    setDisplayBossWarning(false)
    setAttempts(game.totalAttempts)
  }, [])

  // ─── Input Handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      if (e.key === " ") e.preventDefault()
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY)
      mouseRef.current = { active: true, ...coords }
    },
    [getCanvasCoords]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!mouseRef.current.active) return
      const coords = getCanvasCoords(e.clientX, e.clientY)
      mouseRef.current.x = coords.x
      mouseRef.current.y = coords.y
    },
    [getCanvasCoords]
  )

  const handlePointerUp = useCallback(() => {
    mouseRef.current.active = false
  }, [])

  // ─── Start animation loop ───────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [gameLoop])

  const getPlayHistory = useCallback(() => {
    return playHistoryRecorder.formatForAI()
  }, [])

  return {
    canvasRef,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    gameState: displayState,
    score: displayScore,
    lives: displayLives,
    level: displayLevel,
    highScore: displayHighScore,
    bossHp: displayBossHp,
    bossWarning: displayBossWarning,
    attempts,
    startGame,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getPlayHistory,
  }
}
