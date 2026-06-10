export type AxisProtocolVersion = 'v1'

export interface AxisAcpEventBase {
  readonly id: string
  readonly runId: string
  readonly connectionId: string
  readonly sessionId?: string
  readonly sequence: number
  readonly timestamp: string
  readonly protocolVersion: AxisProtocolVersion
  readonly sourceTraceIds: readonly string[]
}

export interface ConnectionStateChangedEvent extends AxisAcpEventBase {
  readonly type: 'connection/state-changed'
  readonly state: 'connected' | 'initialized' | 'closed' | 'crashed'
}

export interface CapabilitySnapshotEvent extends AxisAcpEventBase {
  readonly type: 'capability/snapshot'
  readonly agentCapabilities: Readonly<Record<string, unknown>>
  readonly agentInfo?: Readonly<Record<string, unknown>>
}

export interface ProcessExitedEvent extends AxisAcpEventBase {
  readonly type: 'process/exited'
  readonly code: number | null
  readonly signal: string | null
}

export type AxisAcpEvent =
  | ConnectionStateChangedEvent
  | CapabilitySnapshotEvent
  | ProcessExitedEvent

export type AxisAcpEventListener = (event: AxisAcpEvent) => void
