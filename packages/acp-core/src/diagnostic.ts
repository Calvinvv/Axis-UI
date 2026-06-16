import type { AcpSessionState } from './session-reducer.js'
import type { AxisAcpEvent } from './axis-event.js'
import type { ProtocolTraceFrame } from './protocol-trace.js'

export type DiagnosticKind =
  | 'protocol-violation'
  | 'capability-contract-mismatch'
  | 'scenario-assertion-failure'
  | 'resource-leak'
  | 'runtime-warning'
  | 'performance-regression'
  | 'harness-failure'

export type DiagnosticSubject =
  | 'agent'
  | 'client-profile'
  | 'harness'
  | 'adapter'
  | 'environment'
  | 'unknown'

export interface NormativeReference {
  readonly standard: 'ACP' | 'JSON-RPC'
  readonly protocolVersion?: 1
  readonly section: string
  readonly url: string
  readonly requirement: 'MUST' | 'MUST NOT' | 'SHOULD' | 'SHOULD NOT' | 'MAY'
}

export interface Diagnostic {
  readonly id: string
  readonly kind: DiagnosticKind
  readonly runId: string
  readonly scenarioId: string
  readonly invariantId: string
  readonly severity: 'info' | 'warning' | 'error' | 'fatal'
  readonly subject: DiagnosticSubject
  readonly message: string
  readonly sequence?: number
  readonly traceIds: readonly string[]
  readonly stateSnapshotIds: readonly string[]
  readonly faultInjectionIds: readonly string[]
  readonly references: readonly NormativeReference[]
}

export interface SessionStateSnapshot {
  readonly id: string
  readonly sequence: number
  readonly state: AcpSessionState
}

export interface ClientProfileSnapshot {
  readonly id: string
  readonly capabilities: Readonly<Record<string, unknown>>
  readonly allowedClientMethods: readonly string[]
}

export interface InvariantRunContext {
  readonly runId: string
  readonly scenarioId: string
  readonly profile: ClientProfileSnapshot
  readonly trace: readonly ProtocolTraceFrame[]
  readonly events: readonly AxisAcpEvent[]
  readonly stateSnapshots: readonly SessionStateSnapshot[]
  readonly activeProcessCount: number
  readonly faultInjectionIds: readonly string[]
}

export interface LifecycleInvariant {
  readonly id: string
  readonly category:
    | 'protocol'
    | 'capability-contract'
    | 'axis-scenario'
    | 'resource'
    | 'performance'
  readonly description: string
  readonly references: readonly NormativeReference[]
  evaluate(context: InvariantRunContext): readonly Diagnostic[]
}
