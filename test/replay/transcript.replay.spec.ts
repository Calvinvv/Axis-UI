import type {
  AxisAcpEvent,
  ProtocolTraceFrame,
  TranscriptDraft,
} from '@axis-ui/acp-core'
import {
  createTranscript,
  parseTranscript,
  serializeTranscript,
  stateHash,
  TranscriptReplay,
} from '@axis-ui/acp-core'
import { describe, expect, it } from 'vitest'

const eventMetadata = {
  runId: 'run-replay',
  connectionId: 'connection-replay',
  sessionId: 'session-replay',
  timestamp: '2026-08-20T00:00:00.000Z',
  protocolVersion: 'v1' as const,
  sourceTraceIds: [] as readonly string[],
}

function transcriptDraft(secret = 'sk-test-secret'): TranscriptDraft {
  const prompting: AxisAcpEvent = {
    ...eventMetadata,
    id: 'event-1',
    sequence: 1,
    type: 'session/state-changed',
    state: 'prompting',
  }
  const message: AxisAcpEvent = {
    ...eventMetadata,
    id: 'event-2',
    sequence: 2,
    type: 'message/chunk-appended',
    messageId: 'message-1',
    role: 'agent',
    content: { type: 'text', text: `result for ${secret}` },
  }
  const completed: AxisAcpEvent = {
    ...eventMetadata,
    id: 'event-3',
    sequence: 3,
    type: 'session/state-changed',
    state: 'completed',
    stopReason: 'end_turn',
  }
  const rawFrame: ProtocolTraceFrame = {
    id: 'trace-1',
    runId: eventMetadata.runId,
    connectionId: eventMetadata.connectionId,
    sequence: 1,
    timestamp: eventMetadata.timestamp,
    protocolVersion: 'v1',
    direction: 'client-to-agent',
    kind: 'request',
    method: 'initialize',
    requestId: 1,
    raw: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { token: secret },
    }),
    byteLength: 100,
    parsed: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { token: secret },
    },
  }

  return {
    run: {
      id: eventMetadata.runId,
      scenarioId: 'normal-prompt-turn',
      startedAt: eventMetadata.timestamp,
      completedAt: '2026-08-20T00:00:01.000Z',
      toolkitVersion: '0.0.0',
      protocolVersion: 'v1',
    },
    target: {
      id: 'fixture-agent',
      transport: 'stdio',
      protocolVersion: 'v1',
      args: ['/Users/example/private-workspace'],
    },
    clientProfile: {
      id: 'minimal',
      capabilities: {},
      allowedClientMethods: ['session/update'],
    },
    rawFrames: [rawFrame],
    events: [completed, message, prompting],
    assertions: [{ id: 'session-status', passed: true, message: 'completed' }],
    diagnostics: [],
  }
}

describe('Axis ACP transcript replay', () => {
  it('steps, seeks and restores the same state hash without side effects', async () => {
    const transcript = await createTranscript(transcriptDraft(), {
      secretValues: ['sk-test-secret', '/Users/example/private-workspace'],
    })
    const replay = new TranscriptReplay(transcript)

    expect(replay.step().states['session-replay']?.status).toBe('prompting')
    expect(
      replay.seek(2).states['session-replay']?.messages['message-1']
    ).toBeDefined()
    expect(replay.playToEnd().states['session-replay']?.status).toBe(
      'completed'
    )
    expect(await replay.verifyIntegrity()).toBe(true)

    const serialized = serializeTranscript(transcript)
    const imported = TranscriptReplay.from(serialized)
    imported.playToEnd()
    expect(await imported.stateHashes()).toEqual(
      transcript.integrity.stateHashes
    )
    expect(await imported.verifyIntegrity()).toBe(true)
  })

  it('redacts keys and literal secrets from parsed and raw evidence', async () => {
    const transcript = await createTranscript(transcriptDraft(), {
      secretValues: ['sk-test-secret', '/Users/example/private-workspace'],
    })
    const serialized = serializeTranscript(transcript)

    expect(serialized).not.toContain('sk-test-secret')
    expect(serialized).not.toContain('/Users/example/private-workspace')
    expect(serialized).toContain('[REDACTED]')
    expect(transcript.redactionManifest.entries.length).toBeGreaterThan(2)
    expect(transcript.redactionManifest.entries).toContainEqual(
      expect.objectContaining({ reason: 'sensitive-key' })
    )
    expect(transcript.redactionManifest.entries).toContainEqual(
      expect.objectContaining({ reason: 'secret-value' })
    )
  })

  it('uses canonical object ordering and detects transcript tampering', async () => {
    expect(await stateHash({ b: 2, a: 1 })).toBe(
      await stateHash({ a: 1, b: 2 })
    )

    const transcript = await createTranscript(transcriptDraft())
    const tampered = {
      ...transcript,
      events: transcript.events.map(event =>
        event.id === 'event-3' && event.type === 'session/state-changed'
          ? { ...event, state: 'failed' as const }
          : event
      ),
    }
    const replay = new TranscriptReplay(tampered)
    replay.playToEnd()

    expect(await replay.verifyIntegrity()).toBe(false)
  })

  it('rejects an unsupported schema version before replay', async () => {
    const transcript = await createTranscript(transcriptDraft())

    expect(() => parseTranscript({ ...transcript, schemaVersion: 2 })).toThrow(
      'Unsupported transcript schema version: 2'
    )
  })
})
