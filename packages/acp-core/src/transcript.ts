import type { AxisAcpEvent, AxisProtocolVersion } from './axis-event.js'
import type { ClientProfileSnapshot, Diagnostic } from './diagnostic.js'
import type { ProtocolTraceFrame } from './protocol-trace.js'

export const AXIS_ACP_TRANSCRIPT_SCHEMA_VERSION = 1 as const

export interface TranscriptRunMetadata {
  readonly id: string
  readonly scenarioId?: string
  readonly startedAt: string
  readonly completedAt: string
  readonly toolkitVersion: string
  readonly protocolVersion: AxisProtocolVersion
}

export interface TranscriptTargetSnapshot {
  readonly id: string
  readonly transport: 'stdio'
  readonly protocolVersion: AxisProtocolVersion
  readonly args: readonly string[]
  readonly agentInfo?: Readonly<Record<string, unknown>>
}

export interface TranscriptAssertionResult {
  readonly id: string
  readonly passed: boolean
  readonly message: string
}

export interface RedactionEntry {
  readonly path: string
  readonly reason: 'sensitive-key' | 'secret-value' | 'explicit-path'
}

export interface RedactionManifest {
  readonly version: 1
  readonly replacement: string
  readonly entries: readonly RedactionEntry[]
}

export interface TranscriptIntegrity {
  readonly algorithm: 'SHA-256'
  readonly stateHashes: Readonly<Record<string, string>>
  readonly eventCount: number
  readonly maxSequence: number
}

export interface AxisAcpTranscript {
  readonly schemaVersion: typeof AXIS_ACP_TRANSCRIPT_SCHEMA_VERSION
  readonly run: TranscriptRunMetadata
  readonly target: TranscriptTargetSnapshot
  readonly clientProfile: ClientProfileSnapshot
  readonly rawFrames: readonly ProtocolTraceFrame[]
  readonly events: readonly AxisAcpEvent[]
  readonly assertions: readonly TranscriptAssertionResult[]
  readonly diagnostics: readonly Diagnostic[]
  readonly redactionManifest: RedactionManifest
  readonly integrity: TranscriptIntegrity
}

export type TranscriptDraft = Omit<
  AxisAcpTranscript,
  'schemaVersion' | 'redactionManifest' | 'integrity'
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(record: Record<string, unknown>, key: string): void {
  if (typeof record[key] !== 'string') {
    throw new TypeError(`Transcript field ${key} must be a string`)
  }
}

export function parseTranscript(input: string | unknown): AxisAcpTranscript {
  const value =
    typeof input === 'string' ? (JSON.parse(input) as unknown) : input
  if (!isRecord(value)) throw new TypeError('Transcript must be an object')
  if (value.schemaVersion !== AXIS_ACP_TRANSCRIPT_SCHEMA_VERSION) {
    throw new TypeError(
      `Unsupported transcript schema version: ${String(value.schemaVersion)}`
    )
  }
  if (!isRecord(value.run)) throw new TypeError('Transcript run is missing')
  assertString(value.run, 'id')
  assertString(value.run, 'startedAt')
  assertString(value.run, 'completedAt')
  if (!isRecord(value.target)) {
    throw new TypeError('Transcript target is missing')
  }
  assertString(value.target, 'id')
  if (!isRecord(value.clientProfile)) {
    throw new TypeError('Transcript clientProfile is missing')
  }
  for (const field of ['rawFrames', 'events', 'assertions', 'diagnostics']) {
    if (!Array.isArray(value[field])) {
      throw new TypeError(`Transcript field ${field} must be an array`)
    }
  }
  if (!isRecord(value.redactionManifest) || !isRecord(value.integrity)) {
    throw new TypeError('Transcript redaction or integrity metadata is missing')
  }
  if (!isRecord(value.integrity.stateHashes)) {
    throw new TypeError('Transcript state hashes are missing')
  }
  const events = value.events
  if (!Array.isArray(events)) {
    throw new TypeError('Transcript field events must be an array')
  }
  for (const event of events) {
    if (
      !isRecord(event) ||
      typeof event.id !== 'string' ||
      typeof event.type !== 'string' ||
      typeof event.sequence !== 'number'
    ) {
      throw new TypeError('Transcript contains an invalid event')
    }
  }
  return value as unknown as AxisAcpTranscript
}
