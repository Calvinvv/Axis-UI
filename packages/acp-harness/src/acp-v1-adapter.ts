import type { InitializeResponse } from '@agentclientprotocol/sdk'
import type {
  AxisAcpEvent,
  AxisAcpEventListener,
  CapabilitySnapshotEvent,
  ConnectionStateChangedEvent,
  ProcessExitedEvent,
  SequenceAllocator,
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
