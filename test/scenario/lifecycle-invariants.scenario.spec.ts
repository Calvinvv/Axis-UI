import type { InvariantRunContext, ProtocolTraceFrame } from '@axis-ui/acp-core'
import { describe, expect, it } from 'vitest'
import {
  evaluateLifecycleInvariants,
  lifecycleInvariants,
} from '../../packages/acp-harness/src/invariants.js'

describe('seven lifecycle invariants', () => {
  it('keeps the fixed rule set explicit', () => {
    expect(lifecycleInvariants.map(invariant => invariant.id)).toEqual([
      'jsonrpc-response-correlation',
      'notification-must-not-have-response',
      'stdio-stdout-valid-acp-only',
      'omitted-capability-is-unsupported',
      'cancel-pending-permission-response',
      'cancelled-stop-reason',
      'no-orphan-process-after-run',
    ])
  })

  it('classifies protocol, capability and resource evidence separately', () => {
    const trace: ProtocolTraceFrame[] = [
      frame(1, {
        kind: 'request',
        direction: 'client-to-agent',
        requestId: 2,
        method: 'session/prompt',
      }),
      frame(2, {
        kind: 'request',
        direction: 'agent-to-client',
        requestId: 3,
        method: 'session/request_permission',
      }),
      frame(3, {
        kind: 'request',
        direction: 'agent-to-client',
        requestId: 4,
        method: 'terminal/create',
      }),
      frame(4, {
        kind: 'notification',
        direction: 'client-to-agent',
        method: 'session/cancel',
      }),
      frame(5, {
        kind: 'invalid-json',
        direction: 'agent-to-client',
        raw: 'agent log on stdout',
      }),
      frame(6, {
        kind: 'response',
        direction: 'agent-to-client',
        requestId: 99,
      }),
      frame(7, {
        kind: 'response',
        direction: 'agent-to-client',
        requestId: null,
      }),
    ]
    const context: InvariantRunContext = {
      runId: 'diagnostic-run',
      scenarioId: 'fault-matrix',
      profile: {
        id: 'minimal',
        capabilities: {},
        allowedClientMethods: ['session/update'],
      },
      trace,
      events: [],
      stateSnapshots: [],
      activeProcessCount: 1,
      faultInjectionIds: ['synthetic-seven-rule-matrix'],
    }

    const diagnostics = evaluateLifecycleInvariants(context)

    expect(new Set(diagnostics.map(item => item.invariantId))).toEqual(
      new Set(lifecycleInvariants.map(invariant => invariant.id))
    )
    expect(
      diagnostics.find(
        item => item.invariantId === 'stdio-stdout-valid-acp-only'
      )
    ).toMatchObject({
      kind: 'protocol-violation',
      subject: 'agent',
      references: [expect.objectContaining({ requirement: 'MUST NOT' })],
    })
    expect(
      diagnostics.find(
        item => item.invariantId === 'no-orphan-process-after-run'
      )
    ).toMatchObject({
      kind: 'resource-leak',
      subject: 'harness',
      references: [],
    })
  })

  it('does not treat an already resolved permission as pending at cancel', () => {
    const trace: ProtocolTraceFrame[] = [
      frame(1, {
        kind: 'request',
        direction: 'agent-to-client',
        requestId: 1,
        method: 'session/request_permission',
      }),
      frame(2, {
        kind: 'response',
        direction: 'client-to-agent',
        requestId: 1,
        raw: '{"jsonrpc":"2.0","id":1,"result":{"outcome":{"outcome":"selected","optionId":"allow"}}}',
      }),
      frame(3, {
        kind: 'notification',
        direction: 'client-to-agent',
        method: 'session/cancel',
      }),
    ]
    const diagnostics = evaluateLifecycleInvariants({
      runId: 'resolved-permission-run',
      scenarioId: 'resolved-before-cancel',
      profile: {
        id: 'permission-only',
        capabilities: {},
        allowedClientMethods: ['session/update', 'session/request_permission'],
      },
      trace,
      events: [],
      stateSnapshots: [],
      activeProcessCount: 0,
      faultInjectionIds: [],
    })

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        invariantId: 'cancel-pending-permission-response',
      })
    )
  })
})

function frame(
  sequence: number,
  overrides: Partial<ProtocolTraceFrame>
): ProtocolTraceFrame {
  return {
    id: `trace-${sequence}`,
    runId: 'diagnostic-run',
    connectionId: 'diagnostic-connection',
    sequence,
    timestamp: '2026-08-20T00:00:00.000Z',
    protocolVersion: 'v1',
    direction: 'agent-to-client',
    kind: 'stdout-noise',
    raw: '{}',
    byteLength: 2,
    ...overrides,
  }
}
