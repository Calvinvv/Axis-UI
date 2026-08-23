import type {
  InitializeResponse,
  RequestPermissionOutcome,
  RequestPermissionRequest,
  SessionNotification,
  StopReason,
} from '@agentclientprotocol/sdk'
import type {
  AxisAcpEvent,
  AxisAcpEventListener,
  CapabilitySnapshotEvent,
  ConnectionStateChangedEvent,
  MessageChunkAppendedEvent,
  PermissionRequestedEvent,
  PermissionResolvedEvent,
  ProcessExitedEvent,
  SequenceAllocator,
  SessionStateChangedEvent,
  ToolCallUpsertEvent,
} from '@axis-ui/acp-core'
import type { TargetExit } from './types.js'

export interface AcpV1AdapterOptions {
  readonly runId: string
  readonly connectionId: string
  readonly sequence: SequenceAllocator
  readonly onEvent?: AxisAcpEventListener
  readonly now?: () => Date
}

export class AcpV1Adapter {
  constructor(private readonly options: AcpV1AdapterOptions) {}

  connectionState(
    state: ConnectionStateChangedEvent['state'],
    sourceTraceIds: readonly string[] = []
  ): ConnectionStateChangedEvent {
    return this.emit({
      ...this.metadata(sourceTraceIds),
      type: 'connection/state-changed',
      state,
    })
  }

  initialized(
    response: InitializeResponse,
    sourceTraceIds: readonly string[]
  ): void {
    this.emit<CapabilitySnapshotEvent>({
      ...this.metadata(sourceTraceIds),
      type: 'capability/snapshot',
      agentCapabilities: response.agentCapabilities as Readonly<
        Record<string, unknown>
      >,
      agentInfo: response.agentInfo as
        | Readonly<Record<string, unknown>>
        | undefined,
    })
    this.connectionState('initialized', sourceTraceIds)
  }

  processExited(exit: TargetExit): ProcessExitedEvent {
    return this.emit({
      ...this.metadata([]),
      type: 'process/exited',
      code: exit.code,
      signal: exit.signal,
    })
  }

  sessionState(
    sessionId: string,
    state: SessionStateChangedEvent['state'],
    sourceTraceIds: readonly string[] = [],
    details: { readonly stopReason?: StopReason; readonly error?: string } = {}
  ): SessionStateChangedEvent {
    return this.emit<SessionStateChangedEvent>({
      ...this.sessionMetadata(sourceTraceIds, sessionId),
      type: 'session/state-changed',
      state,
      ...details,
    })
  }

  sessionUpdate(
    notification: SessionNotification,
    sourceTraceIds: readonly string[]
  ): AxisAcpEvent | undefined {
    const { sessionId, update } = notification
    switch (update.sessionUpdate) {
      case 'user_message_chunk':
      case 'agent_message_chunk':
      case 'agent_thought_chunk': {
        const role =
          update.sessionUpdate === 'user_message_chunk'
            ? 'user'
            : update.sessionUpdate === 'agent_thought_chunk'
              ? 'thought'
              : 'agent'
        return this.emit<MessageChunkAppendedEvent>({
          ...this.sessionMetadata(sourceTraceIds, sessionId),
          type: 'message/chunk-appended',
          messageId:
            update.messageId ??
            `${sessionId}:${role}:${sourceTraceIds[0] ?? 'local'}`,
          role,
          content: update.content,
        })
      }
      case 'tool_call':
      case 'tool_call_update':
        return this.emit<ToolCallUpsertEvent>({
          ...this.sessionMetadata(sourceTraceIds, sessionId),
          type: 'tool-call/upsert',
          toolCallId: update.toolCallId,
          patch: update as unknown as Readonly<Record<string, unknown>>,
        })
      default:
        return undefined
    }
  }

  permissionRequested(
    permissionId: string,
    request: RequestPermissionRequest,
    sourceTraceIds: readonly string[]
  ): PermissionRequestedEvent {
    return this.emit<PermissionRequestedEvent>({
      ...this.sessionMetadata(sourceTraceIds, request.sessionId),
      type: 'permission/requested',
      permissionId,
      toolCall: request.toolCall as Readonly<Record<string, unknown>>,
      options: request.options as readonly Readonly<Record<string, unknown>>[],
    })
  }

  permissionResolved(
    permissionId: string,
    sessionId: string,
    outcome: RequestPermissionOutcome,
    sourceTraceIds: readonly string[] = []
  ): PermissionResolvedEvent {
    return this.emit<PermissionResolvedEvent>({
      ...this.sessionMetadata(sourceTraceIds, sessionId),
      type: 'permission/resolved',
      permissionId,
      outcome,
    })
  }

  private metadata(sourceTraceIds: readonly string[]): EventMetadata {
    const sequence = this.options.sequence.next()
    return {
      id: `${this.options.runId}:event:${sequence}`,
      runId: this.options.runId,
      connectionId: this.options.connectionId,
      sequence,
      timestamp: (this.options.now?.() ?? new Date()).toISOString(),
      protocolVersion: 'v1' as const,
      sourceTraceIds,
    }
  }

  private sessionMetadata(
    sourceTraceIds: readonly string[],
    sessionId: string
  ): EventMetadata & { readonly sessionId: string } {
    return { ...this.metadata(sourceTraceIds), sessionId }
  }

  private emit<T extends AxisAcpEvent>(event: T): T {
    this.options.onEvent?.(event)
    return event
  }
}

interface EventMetadata {
  readonly id: string
  readonly runId: string
  readonly connectionId: string
  readonly sessionId?: string
  readonly sequence: number
  readonly timestamp: string
  readonly protocolVersion: 'v1'
  readonly sourceTraceIds: readonly string[]
}
