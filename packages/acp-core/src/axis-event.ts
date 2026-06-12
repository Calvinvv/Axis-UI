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

export type SessionStatus =
  | 'created'
  | 'prompting'
  | 'cancelling'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'crashed'

export interface SessionStateChangedEvent extends AxisAcpEventBase {
  readonly type: 'session/state-changed'
  readonly sessionId: string
  readonly state: SessionStatus
  readonly stopReason?: string
  readonly error?: string
}

export interface MessageChunkAppendedEvent extends AxisAcpEventBase {
  readonly type: 'message/chunk-appended'
  readonly sessionId: string
  readonly messageId: string
  readonly role: 'user' | 'agent' | 'thought'
  readonly content: unknown
}

export interface ToolCallUpsertEvent extends AxisAcpEventBase {
  readonly type: 'tool-call/upsert'
  readonly sessionId: string
  readonly toolCallId: string
  readonly patch: Readonly<Record<string, unknown>>
}

export interface PermissionRequestedEvent extends AxisAcpEventBase {
  readonly type: 'permission/requested'
  readonly sessionId: string
  readonly permissionId: string
  readonly toolCall: Readonly<Record<string, unknown>>
  readonly options: readonly Readonly<Record<string, unknown>>[]
}

export interface PermissionResolvedEvent extends AxisAcpEventBase {
  readonly type: 'permission/resolved'
  readonly sessionId: string
  readonly permissionId: string
  readonly outcome:
    | { readonly outcome: 'cancelled' }
    | { readonly outcome: 'selected'; readonly optionId: string }
}

export type AxisAcpEvent =
  | ConnectionStateChangedEvent
  | CapabilitySnapshotEvent
  | ProcessExitedEvent
  | SessionStateChangedEvent
  | MessageChunkAppendedEvent
  | ToolCallUpsertEvent
  | PermissionRequestedEvent
  | PermissionResolvedEvent

export type AxisAcpEventListener = (event: AxisAcpEvent) => void
