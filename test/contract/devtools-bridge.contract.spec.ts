import { once } from 'node:events'
import WebSocket from 'ws'
import { afterEach, describe, expect, it } from 'vitest'
import { createScenarioBridgeHandler } from '../../packages/acp-cli/src/cli.js'
import { LocalBridge } from '../../packages/acp-harness/src/bridge/local-bridge.js'
import { parseTranscript } from '../../packages/acp-core/src/transcript.js'
import { repositoryRoot } from '../helpers/acp-fixture.js'

const origin = 'http://127.0.0.1:5173'
const bridges: LocalBridge[] = []
const sockets: WebSocket[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.terminate()
  await Promise.all(bridges.splice(0).map(bridge => bridge.stop()))
})

describe('DevTools scenario bridge', () => {
  it('runs a fixed scenario through the authenticated WebSocket boundary', async () => {
    const bridge = new LocalBridge({
      allowedOrigins: [origin],
      onMessage: createScenarioBridgeHandler(),
    })
    bridges.push(bridge)
    const address = await bridge.start()
    const socket = new WebSocket(
      `${address.url}?token=${encodeURIComponent(address.token)}`,
      { origin }
    )
    sockets.push(socket)
    await once(socket, 'open')

    socket.send(
      JSON.stringify({
        type: 'scenario/run',
        requestId: 'scenario-1',
        targetId: 'fixture-agent',
        scenarioId: 'capability-method-mismatch',
        workspaceRoot: repositoryRoot,
      })
    )

    const [data] = (await once(socket, 'message')) as [Buffer]
    const response = JSON.parse(data.toString()) as {
      type: string
      requestId: string
      result: { transcript: unknown }
    }
    expect(response).toMatchObject({
      type: 'response',
      requestId: 'scenario-1',
    })
    expect(
      parseTranscript(response.result.transcript).diagnostics
    ).toContainEqual(
      expect.objectContaining({
        kind: 'capability-contract-mismatch',
        subject: 'agent',
      })
    )
  })
})
