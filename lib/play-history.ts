export type ActionType = "move" | "shoot" | "kill" | "hit" | "level_up" | "boss_spawn"

export interface GameAction {
  type: ActionType
  timestamp: number
  details?: {
    enemyType?: string
    score?: number
    level?: number
    bossPhase?: number
  }
}

export interface PlayHistory {
  actions: GameAction[]
  totalTime: number
  finalScore: number
  finalLevel: number
  lives: number
}

export class PlayHistoryRecorder {
  private actions: GameAction[] = []
  private startTime: number = 0

  constructor() {
    this.reset()
  }

  reset() {
    this.actions = []
    this.startTime = Date.now()
  }

  recordAction(type: ActionType, details?: GameAction["details"]) {
    this.actions.push({
      type,
      timestamp: Date.now() - this.startTime,
      details,
    })
  }

  getHistory(finalScore: number, finalLevel: number, lives: number): PlayHistory {
    return {
      actions: this.actions,
      totalTime: Date.now() - this.startTime,
      finalScore,
      finalLevel,
      lives,
    }
  }

  formatForAI(): string {
    const summary = {
      totalActions: this.actions.length,
      kills: this.actions.filter((a) => a.type === "kill").length,
      hits: this.actions.filter((a) => a.type === "hit").length,
      shots: this.actions.filter((a) => a.type === "shoot").length,
      levelUps: this.actions.filter((a) => a.type === "level_up").length,
      bossEncounters: this.actions.filter((a) => a.type === "boss_spawn").length,
    }

    let narrative = `Game Statistics:\n`
    narrative += `- Total Actions Taken: ${summary.totalActions}\n`
    narrative += `- Enemies Destroyed: ${summary.kills}\n`
    narrative += `- Times Hit: ${summary.hits}\n`
    narrative += `- Shots Fired: ${summary.shots}\n`
    narrative += `- Levels Reached: ${summary.levelUps}\n`
    narrative += `- Boss Encounters: ${summary.bossEncounters}\n`

    // Add timeline of major events
    const majorEvents = this.actions.filter(
      (a) => a.type === "kill" || a.type === "hit" || a.type === "level_up" || a.type === "boss_spawn"
    )

    if (majorEvents.length > 0) {
      narrative += `\nKey Events Timeline:\n`
      majorEvents.slice(0, 20).forEach((event) => {
        const seconds = (event.timestamp / 1000).toFixed(1)
        if (event.type === "kill") {
          narrative += `- [${seconds}s] Destroyed ${event.details?.enemyType || "enemy"} (+${event.details?.score || 0} pts)\n`
        } else if (event.type === "hit") {
          narrative += `- [${seconds}s] Hit by enemy\n`
        } else if (event.type === "level_up") {
          narrative += `- [${seconds}s] Reached Level ${event.details?.level}\n`
        } else if (event.type === "boss_spawn") {
          narrative += `- [${seconds}s] Boss appeared (Phase ${event.details?.bossPhase})\n`
        }
      })
    }

    narrative += `\nProvide constructive AI coach feedback on the player's performance, including:\n`
    narrative += `- What they did well\n`
    narrative += `- Areas for improvement\n`
    narrative += `- Tactical suggestions for next game\n`

    return narrative
  }
}

export const playHistoryRecorder = new PlayHistoryRecorder()
