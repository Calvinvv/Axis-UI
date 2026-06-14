import type {
  AxisAcpEvent,
  PermissionRequestedEvent,
  SessionStatus,
} from './axis-event.js'

export interface SessionMessage {
  readonly id: string
  readonly role: 'user' | 'agent' | 'thought'
  readonly chunks: readonly unknown[]
}

export interface SessionToolCall {
  readonly id: string
  readonly data: Readonly<Record<string, unknown>>
}

export interface PendingPermission {
  readonly id: string
  readonly toolCall: Readonly<Record<string, unknown>>
  readonly options: readonly Readonly<Record<string, unknown>>[]
}

export interface AcpSessionState {
  readonly sessionId: string
  readonly connectionId: string
  readonly status: SessionStatus
  readonly stopReason?: string
  readonly error?: string
  readonly messages: Readonly<Record<string, SessionMessage>>
  readonly toolCalls: Readonly<Record<string, SessionToolCall>>
  readonly pendingPermissions: Readonly<Record<string, PendingPermission>>
  readonly appliedEventIds: readonly string[]
  readonly lastSequence: number
}

const terminalStates = new Set<SessionStatus>([
  'completed',
  'cancelled',
  'failed',
  'crashed',
])

export function createSessionState(
  sessionId: string,
  connectionId: string
): AcpSessionState {
  return {
    sessionId,
    connectionId,
    status: 'created',
    messages: {},
    toolCalls: {},
    pendingPermissions: {},
    appliedEventIds: [],
    lastSequence: 0,
  }
}

export function reduceSessionEvent(
  state: AcpSessionState,
  event: AxisAcpEvent
): AcpSessionState {
  if (event.connectionId !== state.connectionId) return state
  if (event.sessionId !== undefined && event.sessionId !== state.sessionId) {
    return state
  }
  if (state.appliedEventIds.includes(event.id)) return state

  const base = {
    ...state,
    appliedEventIds: [...state.appliedEventIds, event.id],
    lastSequence: Math.max(state.lastSequence, event.sequence),
  }

  switch (event.type) {
    case 'session/state-changed': {
      if (
        terminalStates.has(state.status) &&
        !(event.state === 'prompting' && state.status !== 'crashed')
      ) {
        return base
      }
      return {
        ...base,
        status: event.state,
        stopReason: event.stopReason,
        error: event.error,
        pendingPermissions: terminalStates.has(event.state)
          ? {}
          : state.pendingPermissions,
        toolCalls:
          event.state === 'cancelling'
            ? cancelToolCalls(state.toolCalls)
            : state.toolCalls,
      }
    }
    case 'message/chunk-appended': {
      const existing = state.messages[event.messageId]
      return {
        ...base,
        messages: {
          ...state.messages,
          [event.messageId]: {
            id: event.messageId,
            role: event.role,
            chunks: [...(existing?.chunks ?? []), event.content],
          },
        },
      }
    }
    case 'tool-call/upsert': {
      const existing = state.toolCalls[event.toolCallId]
      return {
        ...base,
        toolCalls: {
          ...state.toolCalls,
          [event.toolCallId]: {
            id: event.toolCallId,
            data: { ...existing?.data, ...event.patch },
          },
        },
      }
    }
    case 'permission/requested':
      return addPermission(base, event)
    case 'permission/resolved': {
      const pendingPermissions = { ...state.pendingPermissions }
      delete pendingPermissions[event.permissionId]
      return { ...base, pendingPermissions }
    }
    case 'process/exited':
      if (state.status === 'completed' || state.status === 'cancelled') {
        return base
      }
      return { ...base, status: 'crashed', pendingPermissions: {} }
    case 'connection/state-changed':
      if (
        event.state !== 'crashed' ||
        state.status === 'completed' ||
        state.status === 'cancelled'
      ) {
        return base
      }
      return { ...base, status: 'crashed', pendingPermissions: {} }
    default:
      return base
  }
}

function cancelToolCalls(
  toolCalls: Readonly<Record<string, SessionToolCall>>
): Readonly<Record<string, SessionToolCall>> {
  return Object.fromEntries(
    Object.entries(toolCalls).map(([id, toolCall]) => {
      const status = toolCall.data.status
      if (status === 'completed' || status === 'failed') return [id, toolCall]
      return [
        id,
        { ...toolCall, data: { ...toolCall.data, status: 'cancelled' } },
      ]
    })
  )
}

export function reduceSessionEvents(
  state: AcpSessionState,
  events: readonly AxisAcpEvent[]
): AcpSessionState {
  return [...events]
    .sort((left, right) => left.sequence - right.sequence)
    .reduce(reduceSessionEvent, state)
}

function addPermission(
  state: AcpSessionState,
  event: PermissionRequestedEvent
): AcpSessionState {
  return {
    ...state,
    pendingPermissions: {
      ...state.pendingPermissions,
      [event.permissionId]: {
        id: event.permissionId,
        toolCall: event.toolCall,
        options: event.options,
      },
    },
  }
}
