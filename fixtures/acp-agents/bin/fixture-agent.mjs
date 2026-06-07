#!/usr/bin/env node
import * as acp from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'

const shouldCrashAfterInitialize = process.argv.includes(
  '--crash-after-initialize'
)

const app = acp
  .agent({ name: 'axis-deterministic-fixture' })
  .onRequest(acp.methods.agent.initialize, () => {
    if (shouldCrashAfterInitialize) setTimeout(() => process.exit(17), 25)
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: {
        name: 'axis-deterministic-fixture',
        version: '0.0.0-gate-02',
      },
    }
  })

const stream = acp.ndJsonStream(
  Writable.toWeb(process.stdout),
  Readable.toWeb(process.stdin)
)

const connection = app.connect(stream)
await connection.closed
