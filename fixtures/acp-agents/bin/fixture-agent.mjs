#!/usr/bin/env node
import * as acp from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'

const shouldCrashAfterInitialize = process.argv.includes(
  '--crash-after-initialize'
)
const shouldEmitStdoutNoise = process.argv.includes('--stdout-noise')
const shouldEmitStderr = process.argv.includes('--stderr-marker')

if (shouldEmitStdoutNoise) process.stdout.write('fixture stdout noise\n')
if (shouldEmitStderr) process.stderr.write('fixture stderr marker\n')

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

const stream = acp.ndJsonStream(
  Writable.toWeb(process.stdout),
  Readable.toWeb(process.stdin)
)

const connection = app.connect(stream)
await connection.closed
