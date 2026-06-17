import { canonicalJson, stateHash } from './canonical-json.js'
import type { AcpSessionState } from './session-reducer.js'
import { createSessionState, reduceSessionEvent } from './session-reducer.js'
import type { AxisAcpEvent } from './axis-event.js'
import type { AxisAcpTranscript } from './transcript.js'
import { parseTranscript } from './transcript.js'

export interface ReplaySnapshot {
  readonly status: 'paused' | 'completed'
  readonly position: number
  readonly currentSequence: number
  readonly states: Readonly<Record<string, AcpSessionState>>
}

function orderedEvents(
  events: readonly AxisAcpEvent[]
): readonly AxisAcpEvent[] {
  return [...events].sort(
    (left, right) =>
      left.sequence - right.sequence || left.id.localeCompare(right.id)
  )
}

export class TranscriptReplay {
  private readonly events: readonly AxisAcpEvent[]
  private readonly sessionStates = new Map<string, AcpSessionState>()
  private position = 0
  private paused = true

  constructor(readonly transcript: AxisAcpTranscript) {
    this.events = orderedEvents(transcript.events)
  }

  static from(input: string | unknown): TranscriptReplay {
    return new TranscriptReplay(parseTranscript(input))
  }

  get snapshot(): ReplaySnapshot {
    return {
      status:
        this.position >= this.events.length && !this.paused
          ? 'completed'
          : 'paused',
      position: this.position,
      currentSequence: this.events[this.position - 1]?.sequence ?? 0,
      states: Object.fromEntries(
        [...this.sessionStates.entries()].sort(([left], [right]) =>
          left.localeCompare(right)
        )
      ),
    }
  }

  pause(): ReplaySnapshot {
    this.paused = true
    return this.snapshot
  }

  reset(): ReplaySnapshot {
    this.position = 0
    this.paused = true
    this.sessionStates.clear()
    return this.snapshot
  }

  step(): ReplaySnapshot {
    const event = this.events[this.position]
    if (event === undefined) {
      this.paused = false
      return this.snapshot
    }
    this.apply(event)
    this.position += 1
    this.paused = true
    return this.snapshot
  }

  seek(sequence: number): ReplaySnapshot {
    this.reset()
    while (
      this.position < this.events.length &&
      (this.events[this.position]?.sequence ?? Number.POSITIVE_INFINITY) <=
        sequence
    ) {
      this.step()
    }
    return this.snapshot
  }

  playToEnd(): ReplaySnapshot {
    this.paused = false
    while (this.position < this.events.length) {
      const event = this.events[this.position]
      if (event !== undefined) this.apply(event)
      this.position += 1
    }
    return this.snapshot
  }

  async stateHashes(): Promise<Readonly<Record<string, string>>> {
    const entries = await Promise.all(
      Object.entries(this.snapshot.states).map(
        async ([sessionId, state]) =>
          [sessionId, await stateHash(state)] as const
      )
    )
    return Object.fromEntries(
      entries.sort(([left], [right]) => left.localeCompare(right))
    )
  }

  async verifyIntegrity(): Promise<boolean> {
    const hashes = await this.stateHashes()
    return (
      canonicalJson(hashes) ===
      canonicalJson(this.transcript.integrity.stateHashes)
    )
  }

  private apply(event: AxisAcpEvent): void {
    if (event.sessionId !== undefined) {
      const state =
        this.sessionStates.get(event.sessionId) ??
        createSessionState(event.sessionId, event.connectionId)
      this.sessionStates.set(event.sessionId, reduceSessionEvent(state, event))
      return
    }
    if (
      event.type !== 'process/exited' &&
      event.type !== 'connection/state-changed'
    ) {
      return
    }
    for (const [sessionId, state] of this.sessionStates) {
      this.sessionStates.set(sessionId, reduceSessionEvent(state, event))
    }
  }
}
