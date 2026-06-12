#!/usr/bin/env node
import * as acp from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'

const shouldCrashAfterInitialize = process.argv.includes(
  '--crash-after-initialize'
)
const shouldEmitStdoutNoise = process.argv.includes('--stdout-noise')
const shouldEmitStderr = process.argv.includes('--stderr-marker')
const shouldRequestPermission = process.argv.includes('--permission-prompt')
const shouldCrashDuringPrompt = process.argv.includes('--crash-during-prompt')

if (shouldEmitStdoutNoise) process.stdout.write('fixture stdout noise\n')
if (shouldEmitStderr) process.stderr.write('fixture stderr marker\n')

let sessionCounter = 0
const cancelledSessions = new Set()

const app = acp
  .agent({ name: 'axis-deterministic-fixture' })
  .onRequest(acp.methods.agent.initialize, () => {
    if (shouldCrashAfterInitialize) setTimeout(() => process.exit(17), 25)
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: {
        name: 'axis-deterministic-fixture',
        version: '0.0.0-fixture',
      },
    }
  })
  .onRequest(acp.methods.agent.session.new, () => {
    sessionCounter += 1
    return { sessionId: `fixture-session-${sessionCounter}` }
  })
  .onRequest(acp.methods.agent.session.prompt, async context => {
    const { sessionId } = context.params
    await context.client.notify(acp.methods.client.session.update, {
      sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        messageId: `message-${sessionCounter}`,
        content: { type: 'text', text: 'fixture response' },
      },
    })

    if (shouldCrashDuringPrompt) {
      setTimeout(() => process.exit(17), 20)
      await new Promise(() => undefined)
    }

    if (shouldRequestPermission) {
      await context.client.notify(acp.methods.client.session.update, {
        sessionId,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'permission-tool',
          title: 'Run deterministic command',
          kind: 'execute',
          status: 'pending',
        },
      })
      const permission = await context.client.request(
        acp.methods.client.session.requestPermission,
        {
          sessionId,
          toolCall: {
            toolCallId: 'permission-tool',
            title: 'Run deterministic command',
            kind: 'execute',
            status: 'pending',
          },
          options: [
            {
              kind: 'allow_once',
              name: 'Allow once',
              optionId: 'allow',
            },
            {
              kind: 'reject_once',
              name: 'Reject once',
              optionId: 'reject',
            },
          ],
        }
      )
      if (
        permission.outcome.outcome === 'cancelled' ||
        cancelledSessions.has(sessionId)
      ) {
        return { stopReason: 'cancelled' }
      }
      await context.client.notify(acp.methods.client.session.update, {
        sessionId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'permission-tool',
          status: 'completed',
        },
      })
    }

    return {
      stopReason: cancelledSessions.has(sessionId) ? 'cancelled' : 'end_turn',
    }
  })
  .onNotification(acp.methods.agent.session.cancel, context => {
    cancelledSessions.add(context.params.sessionId)
  })

const stream = acp.ndJsonStream(
  Writable.toWeb(process.stdout),
  Readable.toWeb(process.stdin)
)

const connection = app.connect(stream)
await connection.closed
