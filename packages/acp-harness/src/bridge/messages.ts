import { HarnessError } from '../errors.js'

export type BridgeMessage =
  | {
      readonly type: 'target/start'
      readonly requestId: string
      readonly targetId: string
      readonly workspaceRoot: string
    }
  | {
      readonly type: 'target/stop'
      readonly requestId: string
      readonly targetHandleId: string
    }
  | {
      readonly type: 'scenario/run'
      readonly requestId: string
      readonly targetId: string
      readonly scenarioId: string
      readonly workspaceRoot: string
    }

function requireString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string' || field.length === 0) {
    throw new HarnessError(
      `Bridge field must be a string: ${key}`,
      'BAD_MESSAGE'
    )
  }
  return field
}

export function parseBridgeMessage(input: unknown): BridgeMessage {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HarnessError('Bridge message must be an object', 'BAD_MESSAGE')
  }
  const value = input as Record<string, unknown>
  const type = requireString(value, 'type')
  const requestId = requireString(value, 'requestId')

  if (type === 'target/start') {
    const allowed = new Set(['type', 'requestId', 'targetId', 'workspaceRoot'])
    if (Object.keys(value).some(key => !allowed.has(key))) {
      throw new HarnessError('Unknown target/start field', 'BAD_MESSAGE')
    }
    return {
      type,
      requestId,
      targetId: requireString(value, 'targetId'),
      workspaceRoot: requireString(value, 'workspaceRoot'),
    }
  }

  if (type === 'target/stop') {
    const allowed = new Set(['type', 'requestId', 'targetHandleId'])
    if (Object.keys(value).some(key => !allowed.has(key))) {
      throw new HarnessError('Unknown target/stop field', 'BAD_MESSAGE')
    }
    return {
      type,
      requestId,
      targetHandleId: requireString(value, 'targetHandleId'),
    }
  }

  if (type === 'scenario/run') {
    const allowed = new Set([
      'type',
      'requestId',
      'targetId',
      'scenarioId',
      'workspaceRoot',
    ])
    if (Object.keys(value).some(key => !allowed.has(key))) {
      throw new HarnessError('Unknown scenario/run field', 'BAD_MESSAGE')
    }
    return {
      type,
      requestId,
      targetId: requireString(value, 'targetId'),
      scenarioId: requireString(value, 'scenarioId'),
      workspaceRoot: requireString(value, 'workspaceRoot'),
    }
  }

  throw new HarnessError(`Unknown bridge message type: ${type}`, 'BAD_MESSAGE')
}
