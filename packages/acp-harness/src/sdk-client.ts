import {
  PROTOCOL_VERSION,
  client,
  methods,
  ndJsonStream,
  type ClientConnection,
  type InitializeResponse,
} from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'
import type { ManagedTarget } from './process-manager.js'

export class AcpSdkClient {
  private readonly connections = new Map<string, ClientConnection>()

  connect(target: ManagedTarget): ClientConnection {
    const stream = ndJsonStream(
      Writable.toWeb(target.child.stdin),
      Readable.toWeb(target.child.stdout)
    )
    const connection = client({ name: 'axis-acp-devkit' })
      .onRequest(methods.client.session.requestPermission, () => ({
        outcome: { outcome: 'cancelled' },
      }))
      .onNotification(methods.client.session.update, () => undefined)
      .connect(stream)

    this.connections.set(target.id, connection)
    void target.exited.then(() => {
      connection.close(new Error('Target process exited'))
      this.connections.delete(target.id)
    })
    return connection
  }

  async initialize(targetHandleId: string): Promise<InitializeResponse> {
    const connection = this.get(targetHandleId)
    return connection.agent.request(methods.agent.initialize, {
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {},
    })
  }

  close(targetHandleId: string): void {
    const connection = this.connections.get(targetHandleId)
    connection?.close()
    this.connections.delete(targetHandleId)
  }

  private get(targetHandleId: string): ClientConnection {
    const connection = this.connections.get(targetHandleId)
    if (!connection) {
      throw new Error(`ACP connection is not open: ${targetHandleId}`)
    }
    return connection
  }
}
