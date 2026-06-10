import {
  PROTOCOL_VERSION,
  client,
  methods,
  ndJsonStream,
  type ClientConnection,
  type InitializeResponse,
} from '@agentclientprotocol/sdk'
import type {
  AxisAcpEventListener,
  ProtocolTraceFrame,
  ProtocolTraceListener,
  SequenceAllocator,
} from '@axis-ui/acp-core'
import { Readable, Writable } from 'node:stream'
import { AcpV1Adapter } from './acp-v1-adapter.js'
import type { ManagedTarget } from './process-manager.js'
import { TransportTap } from './transport-tap.js'

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
      .onRequest(methods.client.session.requestPermission, () => ({
        outcome: { outcome: 'cancelled' },
      }))
      .onNotification(methods.client.session.update, () => undefined)
      .connect(stream)

    this.connections.set(target.id, { connection, tap, adapter })
    adapter.connectionState('connected')
    void target.exited.then(exit => {
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

  close(targetHandleId: string): void {
    const record = this.connections.get(targetHandleId)
    record?.connection.close()
    this.connections.delete(targetHandleId)
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
