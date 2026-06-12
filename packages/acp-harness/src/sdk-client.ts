import {
  PROTOCOL_VERSION,
  client,
  methods,
  ndJsonStream,
  type ClientConnection,
  type InitializeResponse,
  type RequestPermissionOutcome,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
} from '@agentclientprotocol/sdk'
import type {
  AxisAcpEventListener,
  ProtocolTraceFrame,
  ProtocolTraceListener,
  SequenceAllocator,
} from '@axis-ui/acp-core'
import { Readable, Writable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import { AcpV1Adapter } from './acp-v1-adapter.js'
import { HarnessError } from './errors.js'
import type { ManagedTarget } from './process-manager.js'
import { TransportTap } from './transport-tap.js'
import type {
  PermissionDecision,
  PromptInput,
  PromptSubmission,
  SessionIdentity,
} from './types.js'

export interface AcpSdkClientOptions {
  readonly runId: string
  readonly sequence: SequenceAllocator
  readonly onTrace?: ProtocolTraceListener
  readonly onEvent?: AxisAcpEventListener
}

interface ConnectionRecord {
  readonly connection: ClientConnection
  readonly tap: TransportTap
  readonly adapter: AcpV1Adapter
  readonly sessions: Set<string>
  readonly pendingPermissions: Map<string, PendingPermission>
}

interface PendingPermission {
  readonly id: string
  readonly request: RequestPermissionRequest
  readonly requestTraceIds: readonly string[]
  readonly resolve: (response: RequestPermissionResponse) => void
}

export class AcpSdkClient {
  private readonly connections = new Map<string, ConnectionRecord>()

  constructor(private readonly options: AcpSdkClientOptions) {}

  connect(target: ManagedTarget): ClientConnection {
    const tap = new TransportTap({
      runId: this.options.runId,
      connectionId: target.id,
      sequence: this.options.sequence,
      onFrame: this.options.onTrace,
    })
    const adapter = new AcpV1Adapter({
      runId: this.options.runId,
      connectionId: target.id,
      sequence: this.options.sequence,
      onEvent: this.options.onEvent,
    })
    const stream = ndJsonStream(
      tap.tapWritable(
        Writable.toWeb(target.child.stdin) as WritableStream<Uint8Array>,
        'client-to-agent'
      ),
      tap.tapReadable(
        Readable.toWeb(target.child.stdout) as ReadableStream<Uint8Array>,
        'agent-to-client'
      )
    )
    const connection = client({ name: 'axis-acp-devkit' })
      .onRequest(methods.client.session.requestPermission, context => {
        return this.requestPermission(this.get(target.id), context.params)
      })
      .onNotification(methods.client.session.update, context => {
        const record = this.get(target.id)
        const source = this.findFrame(
          record.tap.frames,
          frame =>
            frame.direction === 'agent-to-client' &&
            frame.kind === 'notification' &&
            frame.method === 'session/update'
        )
        record.adapter.sessionUpdate(
          context.params,
          source === undefined ? [] : [source.id]
        )
      })
      .connect(stream)

    const record: ConnectionRecord = {
      connection,
      tap,
      adapter,
      sessions: new Set(),
      pendingPermissions: new Map(),
    }
    this.connections.set(target.id, record)
    adapter.connectionState('connected')
    void target.exited.then(exit => {
      this.cancelPendingPermissions(record)
      connection.close(new Error('Target process exited'))
      this.connections.delete(target.id)
      adapter.processExited(exit)
      adapter.connectionState(
        exit.code === 0 || exit.signal !== null ? 'closed' : 'crashed'
      )
    })
    return connection
  }

  async initialize(targetHandleId: string): Promise<InitializeResponse> {
    const record = this.get(targetHandleId)
    const startingSequence = this.options.sequence.peek()
    const response = await record.connection.agent.request(
      methods.agent.initialize,
      {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
      }
    )
    const requestFrame = this.findFrame(
      record.tap.frames,
      frame =>
        frame.sequence > startingSequence &&
        frame.direction === 'client-to-agent' &&
        frame.kind === 'request' &&
        frame.method === 'initialize'
    )
    const responseFrame = this.findFrame(
      record.tap.frames,
      frame =>
        frame.direction === 'agent-to-client' &&
        frame.kind === 'response' &&
        frame.requestId === requestFrame?.requestId
    )
    record.adapter.initialized(
      response,
      [requestFrame?.id, responseFrame?.id].filter(
        (id): id is string => id !== undefined
      )
    )
    return response
  }

  async createSession(
    targetHandleId: string,
    cwd: string
  ): Promise<SessionIdentity> {
    const record = this.get(targetHandleId)
    const startingSequence = this.options.sequence.peek()
    const response = await record.connection.agent.request(
      methods.agent.session.new,
      { cwd, mcpServers: [] }
    )
    record.sessions.add(response.sessionId)
    const sourceTraceIds = this.correlateRequest(
      record,
      'session/new',
      startingSequence
    )
    record.adapter.sessionState(response.sessionId, 'created', sourceTraceIds)
    return { targetHandleId, sessionId: response.sessionId }
  }

  submitPrompt(input: PromptInput): PromptSubmission {
    const record = this.get(input.targetHandleId)
    this.assertSession(record, input.sessionId)
    if (input.text.length === 0) {
      throw new HarnessError('Prompt must not be empty', 'EMPTY_PROMPT')
    }

    const turnId = randomUUID()
    const startingSequence = this.options.sequence.peek()
    record.adapter.sessionState(input.sessionId, 'prompting')
    const completion = record.connection.agent.request(
      methods.agent.session.prompt,
      {
        sessionId: input.sessionId,
        prompt: [{ type: 'text', text: input.text }],
      }
    )
    void completion.then(
      response => {
        const sourceTraceIds = this.correlateRequest(
          record,
          'session/prompt',
          startingSequence
        )
        record.adapter.sessionState(
          input.sessionId,
          response.stopReason === 'cancelled' ? 'cancelled' : 'completed',
          sourceTraceIds,
          { stopReason: response.stopReason }
        )
      },
      error => {
        record.adapter.sessionState(input.sessionId, 'failed', [], {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    )
    return { turnId, sessionId: input.sessionId }
  }

  async cancelSession(
    targetHandleId: string,
    sessionId: string
  ): Promise<void> {
    const record = this.get(targetHandleId)
    this.assertSession(record, sessionId)
    record.adapter.sessionState(sessionId, 'cancelling')
    const notification = record.connection.agent.notify(
      methods.agent.session.cancel,
      { sessionId }
    )
    this.cancelPendingPermissions(record, sessionId)
    await notification
  }

  respondPermission(decision: PermissionDecision): void {
    const record = this.get(decision.targetHandleId)
    const pending = record.pendingPermissions.get(decision.permissionId)
    if (!pending || pending.request.sessionId !== decision.sessionId) {
      throw new HarnessError(
        `Unknown pending permission: ${decision.permissionId}`,
        'UNKNOWN_PERMISSION'
      )
    }
    const outcome = decision.outcome
    if (
      outcome.outcome === 'selected' &&
      !pending.request.options.some(
        option => option.optionId === outcome.optionId
      )
    ) {
      throw new HarnessError(
        `Unknown permission option: ${outcome.optionId}`,
        'UNKNOWN_PERMISSION_OPTION'
      )
    }
    this.resolvePermission(record, pending, outcome)
  }

  close(targetHandleId: string): void {
    const record = this.connections.get(targetHandleId)
    if (record) this.cancelPendingPermissions(record)
    record?.connection.close()
    this.connections.delete(targetHandleId)
  }

  private requestPermission(
    record: ConnectionRecord,
    request: RequestPermissionRequest
  ): Promise<RequestPermissionResponse> {
    const source = this.findFrame(
      record.tap.frames,
      frame =>
        frame.direction === 'agent-to-client' &&
        frame.kind === 'request' &&
        frame.method === 'session/request_permission'
    )
    const permissionId = source?.id ?? randomUUID()
    const requestTraceIds = source === undefined ? [] : [source.id]
    return new Promise(resolve => {
      const pending: PendingPermission = {
        id: permissionId,
        request,
        requestTraceIds,
        resolve,
      }
      record.pendingPermissions.set(permissionId, pending)
      record.adapter.permissionRequested(permissionId, request, requestTraceIds)
    })
  }

  private cancelPendingPermissions(
    record: ConnectionRecord,
    sessionId?: string
  ): void {
    for (const pending of [...record.pendingPermissions.values()]) {
      if (sessionId !== undefined && pending.request.sessionId !== sessionId) {
        continue
      }
      this.resolvePermission(record, pending, { outcome: 'cancelled' })
    }
  }

  private resolvePermission(
    record: ConnectionRecord,
    pending: PendingPermission,
    outcome: RequestPermissionOutcome
  ): void {
    record.pendingPermissions.delete(pending.id)
    pending.resolve({ outcome })
    record.adapter.permissionResolved(
      pending.id,
      pending.request.sessionId,
      outcome,
      pending.requestTraceIds
    )
  }

  private assertSession(record: ConnectionRecord, sessionId: string): void {
    if (!record.sessions.has(sessionId)) {
      throw new HarnessError(`Unknown session: ${sessionId}`, 'UNKNOWN_SESSION')
    }
  }

  private correlateRequest(
    record: ConnectionRecord,
    method: string,
    startingSequence: number
  ): readonly string[] {
    const request = this.findFrame(
      record.tap.frames,
      frame =>
        frame.sequence > startingSequence &&
        frame.direction === 'client-to-agent' &&
        frame.kind === 'request' &&
        frame.method === method
    )
    const response = this.findFrame(
      record.tap.frames,
      frame =>
        frame.direction === 'agent-to-client' &&
        frame.kind === 'response' &&
        frame.requestId === request?.requestId
    )
    return [request?.id, response?.id].filter(
      (id): id is string => id !== undefined
    )
  }

  private get(targetHandleId: string): ConnectionRecord {
    const record = this.connections.get(targetHandleId)
    if (!record) {
      throw new Error(`ACP connection is not open: ${targetHandleId}`)
    }
    return record
  }

  private findFrame(
    frames: readonly ProtocolTraceFrame[],
    predicate: (frame: ProtocolTraceFrame) => boolean
  ): ProtocolTraceFrame | undefined {
    for (let index = frames.length - 1; index >= 0; index -= 1) {
      const frame = frames[index]
      if (frame && predicate(frame)) return frame
    }
    return undefined
  }
}
