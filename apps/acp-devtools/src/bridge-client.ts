import type { AxisAcpTranscript } from '@axis-ui/acp-core'

export interface BridgeScenarioRequest {
  readonly bridgeUrl: string
  readonly token: string
  readonly targetId: string
  readonly scenarioId: string
  readonly workspaceRoot: string
  readonly timeoutMs?: number
}

export interface BridgeScenarioReport {
  readonly runId: string
  readonly scenarioId: string
  readonly status: 'passed' | 'failed'
  readonly transcript: AxisAcpTranscript
}

function parseLoopbackBridgeUrl(value: string): URL {
  const url = new URL(value)
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (url.protocol !== 'ws:' || !loopbackHosts.has(url.hostname)) {
    throw new Error('The DevTools bridge must use ws:// on loopback')
  }
  return url
}

export function runBridgeScenario(
  request: BridgeScenarioRequest
): Promise<BridgeScenarioReport> {
  return new Promise((resolve, reject) => {
    const url = parseLoopbackBridgeUrl(request.bridgeUrl)
    url.searchParams.set('token', request.token)
    const socket = new WebSocket(url)
    const requestId = crypto.randomUUID()
    const timeout = window.setTimeout(() => {
      socket.close()
      reject(new Error('Timed out waiting for the local bridge'))
    }, request.timeoutMs ?? 125_000)

    const finish = (): void => window.clearTimeout(timeout)
    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'scenario/run',
          requestId,
          targetId: request.targetId,
          scenarioId: request.scenarioId,
          workspaceRoot: request.workspaceRoot,
        })
      )
    })
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)) as {
        type?: string
        requestId?: string
        result?: BridgeScenarioReport
        error?: { message?: string }
      }
      if (message.requestId !== requestId) return
      finish()
      socket.close()
      if (message.type === 'response' && message.result !== undefined) {
        resolve(message.result)
      } else {
        reject(new Error(message.error?.message ?? 'Local bridge failed'))
      }
    })
    socket.addEventListener('error', () => {
      finish()
      reject(new Error('Could not connect to the authenticated local bridge'))
    })
  })
}
