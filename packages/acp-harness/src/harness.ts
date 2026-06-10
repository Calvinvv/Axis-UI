import type {
  AxisAcpEvent,
  AxisAcpEventListener,
  ProtocolTraceFrame,
  ProtocolTraceListener,
} from '@axis-ui/acp-core'
import { SequenceAllocator } from '@axis-ui/acp-core'
import { randomUUID } from 'node:crypto'
import { ProcessManager } from './process-manager.js'
import { AcpSdkClient } from './sdk-client.js'
import { TargetRegistry } from './target-registry.js'
import type {
  HarnessInitialization,
  TargetHandle,
  TargetStartRequest,
} from './types.js'

export class AcpHarness {
  readonly runId: string
  private readonly sequence = new SequenceAllocator()
  private readonly sdk: AcpSdkClient
  private readonly eventListeners = new Set<AxisAcpEventListener>()
  private readonly traceListeners = new Set<ProtocolTraceListener>()
  private readonly recordedEvents: AxisAcpEvent[] = []
  private readonly recordedTrace: ProtocolTraceFrame[] = []

  constructor(
    readonly registry: TargetRegistry,
    readonly processes = new ProcessManager(),
    runId: string = randomUUID()
  ) {
    this.runId = runId
    this.sdk = new AcpSdkClient({
      runId,
      sequence: this.sequence,
      onEvent: event => this.publishEvent(event),
      onTrace: frame => this.publishTrace(frame),
    })
  }

  get events(): readonly AxisAcpEvent[] {
    return this.recordedEvents
  }

  get trace(): readonly ProtocolTraceFrame[] {
    return this.recordedTrace
  }

  subscribeEvents(listener: AxisAcpEventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  subscribeTrace(listener: ProtocolTraceListener): () => void {
    this.traceListeners.add(listener)
    return () => this.traceListeners.delete(listener)
  }

  async startTarget(request: TargetStartRequest): Promise<TargetHandle> {
    const resolved = await this.registry.resolve(request)
    const target = this.processes.start(resolved)
    this.sdk.connect(target)
    return target
  }

  async initialize(targetHandleId: string): Promise<HarnessInitialization> {
    return {
      targetHandleId,
      response: await this.sdk.initialize(targetHandleId),
    }
  }

  async stopTarget(targetHandleId: string): Promise<void> {
    await this.processes.stop(targetHandleId)
    this.sdk.close(targetHandleId)
  }

  async dispose(): Promise<void> {
    for (const target of this.processes.list()) this.sdk.close(target.id)
    await this.processes.stopAll()
  }

  private publishEvent(event: AxisAcpEvent): void {
    this.recordedEvents.push(event)
    for (const listener of this.eventListeners) listener(event)
  }

  private publishTrace(frame: ProtocolTraceFrame): void {
    this.recordedTrace.push(frame)
    for (const listener of this.traceListeners) listener(frame)
  }
}
