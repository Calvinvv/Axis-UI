import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import { isIP } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'
import { HarnessError } from '../errors.js'
import { parseBridgeMessage, type BridgeMessage } from './messages.js'

export interface LocalBridgeOptions {
  readonly host?: string
  readonly port?: number
  readonly allowedOrigins: readonly string[]
  readonly maxConnections?: number
  readonly maxMessageBytes?: number
  readonly maxMessagesPerWindow?: number
  readonly rateWindowMs?: number
  readonly token?: string
  readonly onMessage: (message: BridgeMessage) => Promise<unknown>
}

export interface LocalBridgeAddress {
  readonly host: string
  readonly port: number
  readonly token: string
  readonly url: string
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export class LocalBridge {
  readonly token: string
  private readonly host: string
  private readonly port: number
  private readonly maxConnections: number
  private readonly maxMessagesPerWindow: number
  private readonly rateWindowMs: number
  private readonly sockets = new Set<WebSocket>()
  private readonly server: Server
  private readonly webSockets: WebSocketServer
  private address?: LocalBridgeAddress

  constructor(private readonly options: LocalBridgeOptions) {
    this.host = options.host ?? '127.0.0.1'
    this.port = options.port ?? 0
    this.maxConnections = options.maxConnections ?? 2
    this.maxMessagesPerWindow = options.maxMessagesPerWindow ?? 30
    this.rateWindowMs = options.rateWindowMs ?? 1_000
    this.token = options.token ?? randomBytes(32).toString('base64url')

    if (!isLoopbackHost(this.host)) {
      throw new HarnessError(
        `Bridge must bind to loopback, received ${this.host}`,
        'NON_LOOPBACK_BRIDGE'
      )
    }
    if (this.token.length < 32) {
      throw new HarnessError('Bridge token is too short', 'WEAK_BRIDGE_TOKEN')
    }

    this.server = createServer((_request, response) => {
      response.writeHead(404).end()
    })
    this.webSockets = new WebSocketServer({
      noServer: true,
      maxPayload: options.maxMessageBytes ?? 256 * 1024,
    })
    this.server.on('upgrade', (request, socket, head) => {
      if (
        !this.authorizeUpgrade(request) ||
        this.sockets.size >= this.maxConnections
      ) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
        socket.destroy()
        return
      }
      this.webSockets.handleUpgrade(request, socket, head, webSocket => {
        this.webSockets.emit('connection', webSocket, request)
      })
    })
    this.webSockets.on('connection', socket => this.handleConnection(socket))
  }

  async start(): Promise<LocalBridgeAddress> {
    if (this.address) return this.address
    await new Promise<void>((resolveListen, rejectListen) => {
      this.server.once('error', rejectListen)
      this.server.listen(this.port, this.host, () => {
        this.server.off('error', rejectListen)
        resolveListen()
      })
    })
    const serverAddress = this.server.address()
    if (!serverAddress || typeof serverAddress === 'string') {
      throw new HarnessError(
        'Bridge did not expose a TCP address',
        'BRIDGE_BIND_FAILED'
      )
    }
    this.address = {
      host: this.host,
      port: serverAddress.port,
      token: this.token,
      url: `ws://${this.host}:${serverAddress.port}`,
    }
    return this.address
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets) socket.close(1001, 'Bridge stopping')
    await new Promise<void>(resolveClose =>
      this.webSockets.close(() => resolveClose())
    )
    if (this.server.listening) {
      await new Promise<void>((resolveClose, rejectClose) =>
        this.server.close(error =>
          error ? rejectClose(error) : resolveClose()
        )
      )
    }
    this.address = undefined
  }

  private authorizeUpgrade(request: IncomingMessage): boolean {
    const remoteAddress = request.socket.remoteAddress ?? ''
    if (!this.isLoopbackAddress(remoteAddress)) return false

    const origin = request.headers.origin
    if (!origin || !this.options.allowedOrigins.includes(origin)) return false

    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const presentedToken = url.searchParams.get('token') ?? ''
    return equalSecret(presentedToken, this.token)
  }

  private isLoopbackAddress(address: string): boolean {
    if (address === '::1' || address === '127.0.0.1') return true
    if (address.startsWith('::ffff:')) {
      return address.slice('::ffff:'.length) === '127.0.0.1'
    }
    return isIP(address) === 4 && address.startsWith('127.')
  }

  private handleConnection(socket: WebSocket): void {
    this.sockets.add(socket)
    const messageTimes: number[] = []
    socket.on('close', () => this.sockets.delete(socket))
    socket.on('message', async (data, isBinary) => {
      const now = Date.now()
      while (
        messageTimes[0] !== undefined &&
        now - messageTimes[0] > this.rateWindowMs
      ) {
        messageTimes.shift()
      }
      messageTimes.push(now)
      if (messageTimes.length > this.maxMessagesPerWindow) {
        socket.close(1008, 'Rate limit exceeded')
        return
      }

      if (isBinary) {
        socket.close(1003, 'Binary messages are not supported')
        return
      }

      let requestId = 'unknown'
      try {
        const parsed = JSON.parse(data.toString()) as unknown
        const message = parseBridgeMessage(parsed)
        requestId = message.requestId
        const result = await this.options.onMessage(message)
        socket.send(JSON.stringify({ type: 'response', requestId, result }))
      } catch (error) {
        const code =
          error instanceof HarnessError ? error.code : 'BRIDGE_FAILURE'
        const message = error instanceof Error ? error.message : String(error)
        socket.send(
          JSON.stringify({ type: 'error', requestId, error: { code, message } })
        )
      }
    })
  }
}
