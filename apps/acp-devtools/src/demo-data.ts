import {
  createTranscript,
  type AxisAcpEvent,
  type AxisAcpTranscript,
  type Diagnostic,
  type ProtocolFrameKind,
  type ProtocolTraceFrame,
} from '@axis-ui/acp-core'

export interface DevToolsRun {
  readonly id: string
  readonly status: 'passed' | 'failed'
  readonly source: 'sample' | 'bridge' | 'import'
  readonly transcript: AxisAcpTranscript
}

type ScenarioId =
  | 'normal-prompt-turn'
  | 'cancel-during-permission'
  | 'capability-method-mismatch'

const timestamp = '2026-08-20T04:00:00.000Z'

function frame(
  runId: string,
  sequence: number,
  input: {
    kind: ProtocolFrameKind
    direction: ProtocolTraceFrame['direction']
    method?: string
    requestId?: number | null
    payload: Record<string, unknown>
  }
): ProtocolTraceFrame {
  const raw = JSON.stringify(input.payload)
  return {
    id: `${runId}:trace:${sequence}`,
    runId,
    connectionId: `${runId}:connection`,
    sequence,
    timestamp,
    protocolVersion: 'v1',
    direction: input.direction,
    kind: input.kind,
    raw,
    byteLength: new TextEncoder().encode(raw).byteLength,
    parsed: input.payload as ProtocolTraceFrame['parsed'],
    method: input.method,
    requestId: input.requestId,
  }
}

function eventBase(runId: string, sequence: number) {
  return {
    id: `${runId}:event:${sequence}`,
    runId,
    connectionId: `${runId}:connection`,
    sessionId: `${runId}:session`,
    sequence,
    timestamp,
    protocolVersion: 'v1' as const,
    sourceTraceIds: [] as readonly string[],
  }
}

async function sampleTranscript(
  scenarioId: ScenarioId
): Promise<AxisAcpTranscript> {
  const runId = `sample-${scenarioId}`
  const sessionId = `${runId}:session`
  const rawFrames: ProtocolTraceFrame[] = [
    frame(runId, 1, {
      kind: 'request',
      direction: 'client-to-agent',
      method: 'initialize',
      requestId: 1,
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: 1, clientCapabilities: {} },
      },
    }),
    frame(runId, 2, {
      kind: 'response',
      direction: 'agent-to-client',
      requestId: 1,
      payload: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: 1,
          agentInfo: { name: 'Axis deterministic fixture', version: '0.0.0' },
          agentCapabilities: { promptCapabilities: { image: false } },
        },
      },
    }),
    frame(runId, 4, {
      kind: 'request',
      direction: 'client-to-agent',
      method: 'session/new',
      requestId: 2,
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'session/new',
        params: { cwd: '[REDACTED]', mcpServers: [] },
      },
    }),
    frame(runId, 5, {
      kind: 'response',
      direction: 'agent-to-client',
      requestId: 2,
      payload: { jsonrpc: '2.0', id: 2, result: { sessionId } },
    }),
    frame(runId, 7, {
      kind: 'request',
      direction: 'client-to-agent',
      method: 'session/prompt',
      requestId: 3,
      payload: {
        jsonrpc: '2.0',
        id: 3,
        method: 'session/prompt',
        params: { sessionId, prompt: '[REDACTED]' },
      },
    }),
  ]
  const events: AxisAcpEvent[] = [
    {
      ...eventBase(runId, 3),
      sessionId: undefined,
      type: 'capability/snapshot',
      agentInfo: { name: 'Axis deterministic fixture', version: '0.0.0' },
      agentCapabilities: { promptCapabilities: { image: false } },
      sourceTraceIds: [`${runId}:trace:1`, `${runId}:trace:2`],
    },
    {
      ...eventBase(runId, 6),
      type: 'session/state-changed',
      state: 'created',
      sourceTraceIds: [`${runId}:trace:4`, `${runId}:trace:5`],
    },
    {
      ...eventBase(runId, 8),
      type: 'session/state-changed',
      state: 'prompting',
      sourceTraceIds: [`${runId}:trace:7`],
    },
  ]
  const diagnostics: Diagnostic[] = []

  if (scenarioId === 'normal-prompt-turn') {
    rawFrames.push(
      frame(runId, 9, {
        kind: 'notification',
        direction: 'agent-to-client',
        method: 'session/update',
        payload: {
          jsonrpc: '2.0',
          method: 'session/update',
          params: {
            sessionId,
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: 'Ready.' },
            },
          },
        },
      }),
      frame(runId, 11, {
        kind: 'response',
        direction: 'agent-to-client',
        requestId: 3,
        payload: { jsonrpc: '2.0', id: 3, result: { stopReason: 'end_turn' } },
      })
    )
    events.push(
      {
        ...eventBase(runId, 10),
        type: 'message/chunk-appended',
        messageId: 'message-1',
        role: 'agent',
        content: { type: 'text', text: 'Ready.' },
        sourceTraceIds: [`${runId}:trace:9`],
      },
      {
        ...eventBase(runId, 12),
        type: 'session/state-changed',
        state: 'completed',
        stopReason: 'end_turn',
        sourceTraceIds: [`${runId}:trace:7`, `${runId}:trace:11`],
      }
    )
  } else if (scenarioId === 'cancel-during-permission') {
    rawFrames.push(
      frame(runId, 9, {
        kind: 'request',
        direction: 'agent-to-client',
        method: 'session/request_permission',
        requestId: 4,
        payload: {
          jsonrpc: '2.0',
          id: 4,
          method: 'session/request_permission',
          params: {
            sessionId,
            toolCall: { toolCallId: 'tool-1', title: 'Run tests' },
            options: [
              {
                optionId: 'allow_once',
                name: 'Allow once',
                kind: 'allow_once',
              },
            ],
          },
        },
      }),
      frame(runId, 12, {
        kind: 'notification',
        direction: 'client-to-agent',
        method: 'session/cancel',
        payload: {
          jsonrpc: '2.0',
          method: 'session/cancel',
          params: { sessionId },
        },
      }),
      frame(runId, 13, {
        kind: 'response',
        direction: 'client-to-agent',
        requestId: 4,
        payload: {
          jsonrpc: '2.0',
          id: 4,
          result: { outcome: { outcome: 'cancelled' } },
        },
      }),
      frame(runId, 16, {
        kind: 'response',
        direction: 'agent-to-client',
        requestId: 3,
        payload: { jsonrpc: '2.0', id: 3, result: { stopReason: 'cancelled' } },
      })
    )
    events.push(
      {
        ...eventBase(runId, 10),
        type: 'permission/requested',
        permissionId: `${runId}:trace:9`,
        toolCall: { toolCallId: 'tool-1', title: 'Run tests' },
        options: [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
        ],
        sourceTraceIds: [`${runId}:trace:9`],
      },
      {
        ...eventBase(runId, 11),
        type: 'session/state-changed',
        state: 'cancelling',
      },
      {
        ...eventBase(runId, 14),
        type: 'permission/resolved',
        permissionId: `${runId}:trace:9`,
        outcome: { outcome: 'cancelled' },
        sourceTraceIds: [`${runId}:trace:9`, `${runId}:trace:13`],
      },
      {
        ...eventBase(runId, 17),
        type: 'session/state-changed',
        state: 'cancelled',
        stopReason: 'cancelled',
        sourceTraceIds: [`${runId}:trace:7`, `${runId}:trace:16`],
      }
    )
  } else {
    rawFrames.push(
      frame(runId, 9, {
        kind: 'request',
        direction: 'agent-to-client',
        method: 'terminal/create',
        requestId: 4,
        payload: {
          jsonrpc: '2.0',
          id: 4,
          method: 'terminal/create',
          params: { sessionId, command: 'echo' },
        },
      }),
      frame(runId, 11, {
        kind: 'response',
        direction: 'agent-to-client',
        requestId: 3,
        payload: { jsonrpc: '2.0', id: 3, result: { stopReason: 'end_turn' } },
      })
    )
    events.push({
      ...eventBase(runId, 12),
      type: 'session/state-changed',
      state: 'completed',
      stopReason: 'end_turn',
      sourceTraceIds: [`${runId}:trace:7`, `${runId}:trace:11`],
    })
    diagnostics.push({
      id: `${runId}:diagnostic:capability`,
      kind: 'capability-contract-mismatch',
      runId,
      scenarioId,
      invariantId: 'omitted-capability-is-unsupported',
      severity: 'error',
      subject: 'agent',
      message:
        'Agent called terminal/create although the capability was omitted',
      sequence: 9,
      traceIds: [`${runId}:trace:9`],
      stateSnapshotIds: [`${runId}:event:8:state:${sessionId}`],
      faultInjectionIds: ['unsupported-terminal-request'],
      references: [
        {
          standard: 'ACP',
          protocolVersion: 1,
          section: 'Initialization / Client Capabilities',
          url: 'https://agentclientprotocol.com/protocol/v1/initialization',
          requirement: 'MUST',
        },
      ],
    })
  }

  return createTranscript({
    run: {
      id: runId,
      scenarioId,
      startedAt: timestamp,
      completedAt: '2026-08-20T04:00:01.000Z',
      toolkitVersion: '0.0.0',
      protocolVersion: 'v1',
    },
    target: {
      id: 'fixture-agent',
      transport: 'stdio',
      protocolVersion: 'v1',
      args: [],
      agentInfo: { name: 'Axis deterministic fixture', version: '0.0.0' },
    },
    clientProfile: {
      id:
        scenarioId === 'cancel-during-permission'
          ? 'permission-only'
          : 'minimal',
      capabilities: {},
      allowedClientMethods:
        scenarioId === 'cancel-during-permission'
          ? ['session/update', 'session/request_permission']
          : ['session/update'],
    },
    rawFrames,
    events,
    assertions: [
      {
        id: 'session-status',
        passed: true,
        message: 'Expected terminal state observed',
      },
      {
        id: 'no-pending-permissions',
        passed: true,
        message: 'No pending permissions remain',
      },
    ],
    diagnostics,
  })
}

export async function loadDemoRuns(): Promise<readonly DevToolsRun[]> {
  const scenarioIds: readonly ScenarioId[] = [
    'normal-prompt-turn',
    'cancel-during-permission',
    'capability-method-mismatch',
  ]
  return Promise.all(
    scenarioIds.map(async scenarioId => ({
      id: `sample-${scenarioId}`,
      status: 'passed' as const,
      source: 'sample' as const,
      transcript: await sampleTranscript(scenarioId),
    }))
  )
}
