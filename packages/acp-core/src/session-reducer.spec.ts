import { describe, expect, it } from 'vitest'
import type { AxisAcpEvent } from './axis-event.js'
import {
  createSessionState,
  reduceSessionEvent,
  reduceSessionEvents,
} from './session-reducer.js'

const metadata = {
  runId: 'run-reducer',
  connectionId: 'connection-reducer',
  sessionId: 'session-reducer',
  timestamp: '2026-08-20T00:00:00.000Z',
  protocolVersion: 'v1' as const,
  sourceTraceIds: [],
}

describe('reduceSessionEvent', () => {
  it('aggregates message chunks and ignores a duplicate event ID', () => {
    const initial = createSessionState(
      metadata.sessionId,
      metadata.connectionId
    )
    const first: AxisAcpEvent = {
      ...metadata,
      id: 'chunk-1',
      sequence: 1,
      type: 'message/chunk-appended',
      messageId: 'message-1',
      role: 'agent',
      content: { type: 'text', text: 'hello' },
    }
    const second: AxisAcpEvent = {
      ...first,
      id: 'chunk-2',
      sequence: 2,
      content: { type: 'text', text: ' world' },
    }

    const state = reduceSessionEvents(initial, [second, first, first])

    expect(state.messages['message-1']?.chunks).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'text', text: ' world' },
    ])
    expect(state.appliedEventIds).toEqual(['chunk-1', 'chunk-2'])
  })

  it('uses sequence order so the first observed terminal state wins', () => {
    const initial = createSessionState(
      metadata.sessionId,
      metadata.connectionId
    )
    const cancelled: AxisAcpEvent = {
      ...metadata,
      id: 'cancelled',
      sequence: 4,
      type: 'session/state-changed',
      state: 'cancelled',
      stopReason: 'cancelled',
    }
    const completed: AxisAcpEvent = {
      ...metadata,
      id: 'completed',
      sequence: 5,
      type: 'session/state-changed',
      state: 'completed',
      stopReason: 'end_turn',
    }

    expect(reduceSessionEvents(initial, [completed, cancelled]).status).toBe(
      'cancelled'
    )
  })

  it('clears pending permissions when the target process crashes', () => {
    const initial = createSessionState(
      metadata.sessionId,
      metadata.connectionId
    )
    const requested: AxisAcpEvent = {
      ...metadata,
      id: 'permission',
      sequence: 1,
      type: 'permission/requested',
      permissionId: 'permission-1',
      toolCall: { toolCallId: 'tool-1' },
      options: [],
    }
    const crashed: AxisAcpEvent = {
      ...metadata,
      sessionId: undefined,
      id: 'crash',
      sequence: 3,
      type: 'process/exited',
      code: 17,
      signal: null,
    }
    const transportFailed: AxisAcpEvent = {
      ...metadata,
      id: 'transport-failed',
      sequence: 2,
      type: 'session/state-changed',
      state: 'failed',
      error: 'transport closed',
    }

    const pending = reduceSessionEvent(initial, requested)
    const failed = reduceSessionEvent(pending, transportFailed)
    const state = reduceSessionEvent(failed, crashed)

    expect(state.status).toBe('crashed')
    expect(state.pendingPermissions).toEqual({})
  })

  it('does not apply an event from another session', () => {
    const initial = createSessionState(
      metadata.sessionId,
      metadata.connectionId
    )
    const event: AxisAcpEvent = {
      ...metadata,
      sessionId: 'another-session',
      id: 'other-session-event',
      sequence: 1,
      type: 'session/state-changed',
      state: 'prompting',
    }

    expect(reduceSessionEvent(initial, event)).toBe(initial)
  })
})
