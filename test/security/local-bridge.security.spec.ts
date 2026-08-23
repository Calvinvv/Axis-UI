import { once } from 'node:events'
import WebSocket from 'ws'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalBridge } from '../../packages/acp-harness/src/bridge/local-bridge.js'
import { TargetRegistry } from '../../packages/acp-harness/src/target-registry.js'
import { fixtureTarget, repositoryRoot } from '../helpers/acp-fixture.js'

const origin = 'http://127.0.0.1:5173'
const bridges: LocalBridge[] = []
const sockets: WebSocket[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.terminate()
  await Promise.all(bridges.splice(0).map(bridge => bridge.stop()))
})

async function connect(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url, { origin })
  sockets.push(socket)
  await once(socket, 'open')
  return socket
}

async function nextJson(socket: WebSocket): Promise<Record<string, unknown>> {
  const [data] = (await once(socket, 'message')) as [Buffer]
  return JSON.parse(data.toString()) as Record<string, unknown>
}

describe('LocalBridge security boundary', () => {
  it('refuses a non-loopback bind address and weak token', () => {
    expect(
      () =>
        new LocalBridge({
          host: '0.0.0.0',
          allowedOrigins: [origin],
          onMessage: async () => ({}),
        })
    ).toThrowError(expect.objectContaining({ code: 'NON_LOOPBACK_BRIDGE' }))

    expect(
      () =>
        new LocalBridge({
          token: 'short',
          allowedOrigins: [origin],
          onMessage: async () => ({}),
        })
    ).toThrowError(expect.objectContaining({ code: 'WEAK_BRIDGE_TOKEN' }))
  })

  it('requires both an allowed Origin and the high-entropy token', async () => {
    const bridge = new LocalBridge({
      allowedOrigins: [origin],
      onMessage: async () => ({}),
    })
    bridges.push(bridge)
    const address = await bridge.start()

    const wrongToken = new WebSocket(`${address.url}?token=${'x'.repeat(43)}`, {
      origin,
    })
    wrongToken.on('error', () => undefined)
    const [request, response] = (await once(
      wrongToken,
      'unexpected-response'
    )) as [unknown, { statusCode: number }]
    void request
    expect(response.statusCode).toBe(401)

    const wrongOrigin = new WebSocket(
      `${address.url}?token=${encodeURIComponent(address.token)}`,
      { origin: 'https://evil.example' }
    )
    wrongOrigin.on('error', () => undefined)
    const [, originResponse] = (await once(
      wrongOrigin,
      'unexpected-response'
    )) as [unknown, { statusCode: number }]
    expect(originResponse.statusCode).toBe(401)
  })

  it('accepts only the strict target message schema and known target IDs', async () => {
    const registry = await TargetRegistry.create(
      [fixtureTarget],
      [repositoryRoot]
    )
    const bridge = new LocalBridge({
      allowedOrigins: [origin],
      onMessage: async message => {
        if (message.type === 'target/start') registry.get(message.targetId)
        return { accepted: true }
      },
    })
    bridges.push(bridge)
    const address = await bridge.start()
    const socket = await connect(
      `${address.url}?token=${encodeURIComponent(address.token)}`
    )

    socket.send(
      JSON.stringify({
        type: 'target/start',
        requestId: 'bad-fields',
        targetId: 'fixture-agent',
        workspaceRoot: repositoryRoot,
        command: '/bin/sh',
      })
    )
    expect(await nextJson(socket)).toMatchObject({
      type: 'error',
      error: { code: 'BAD_MESSAGE' },
    })

    socket.send(
      JSON.stringify({
        type: 'scenario/run',
        requestId: 'arbitrary-args',
        targetId: 'fixture-agent',
        scenarioId: 'normal-prompt-turn',
        workspaceRoot: repositoryRoot,
        args: ['--execute-arbitrary-command'],
      })
    )
    expect(await nextJson(socket)).toMatchObject({
      type: 'error',
      requestId: 'unknown',
      error: { code: 'BAD_MESSAGE' },
    })

    socket.send(
      JSON.stringify({
        type: 'target/start',
        requestId: 'unknown-target',
        targetId: 'shell',
        workspaceRoot: repositoryRoot,
      })
    )
    expect(await nextJson(socket)).toMatchObject({
      type: 'error',
      requestId: 'unknown-target',
      error: { code: 'UNKNOWN_TARGET' },
    })

    socket.send(
      JSON.stringify({
        type: 'target/start',
        requestId: 'known-target',
        targetId: 'fixture-agent',
        workspaceRoot: repositoryRoot,
      })
    )
    expect(await nextJson(socket)).toMatchObject({
      type: 'response',
      requestId: 'known-target',
      result: { accepted: true },
    })
  })

  it('closes a connection that exceeds the configured message rate', async () => {
    const bridge = new LocalBridge({
      allowedOrigins: [origin],
      maxMessagesPerWindow: 1,
      rateWindowMs: 10_000,
      onMessage: async () => ({}),
    })
    bridges.push(bridge)
    const address = await bridge.start()
    const socket = await connect(
      `${address.url}?token=${encodeURIComponent(address.token)}`
    )
    const message = JSON.stringify({
      type: 'target/stop',
      requestId: 'rate',
      targetHandleId: 'handle',
    })

    socket.send(message)
    await nextJson(socket)
    socket.send(message)
    const [code] = (await once(socket, 'close')) as [number]

    expect(code).toBe(1008)
  })
})
