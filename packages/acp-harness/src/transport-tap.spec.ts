import { SequenceAllocator } from '@axis-ui/acp-core'
import { describe, expect, it } from 'vitest'
import { TransportTap } from './transport-tap.js'

describe('TransportTap', () => {
  it('preserves chunked bytes while framing complete NDJSON lines', async () => {
    const chunks: Uint8Array[] = []
    const destination = new WritableStream<Uint8Array>({
      write: chunk => {
        chunks.push(chunk)
      },
    })
    const tap = new TransportTap({
      runId: 'run-tap',
      connectionId: 'connection-tap',
      sequence: new SequenceAllocator(),
    })
    const writer = tap.tapWritable(destination, 'client-to-agent').getWriter()
    const encoder = new TextEncoder()

    await writer.write(encoder.encode('{"jsonrpc":"2.0","id":1,'))
    await writer.write(encoder.encode('"method":"initialize"}\n'))
    await writer.close()

    expect(new TextDecoder().decode(Buffer.concat(chunks))).toBe(
      '{"jsonrpc":"2.0","id":1,"method":"initialize"}\n'
    )
    expect(tap.frames).toEqual([
      expect.objectContaining({
        direction: 'client-to-agent',
        kind: 'request',
        method: 'initialize',
        requestId: 1,
        raw: '{"jsonrpc":"2.0","id":1,"method":"initialize"}',
      }),
    ])
  })

  it('keeps invalid JSON and valid non-RPC stdout as diagnostic frames', async () => {
    const tap = new TransportTap({
      runId: 'run-noise',
      connectionId: 'connection-noise',
      sequence: new SequenceAllocator(),
    })
    const writer = tap
      .tapWritable(new WritableStream(), 'agent-to-client')
      .getWriter()

    await writer.write(
      new TextEncoder().encode('plain log line\n{"log":"structured noise"}\n')
    )
    await writer.close()

    expect(tap.frames.map(frame => frame.kind)).toEqual([
      'invalid-json',
      'stdout-noise',
    ])
    expect(tap.frames[0]?.parseError).toBeTruthy()
  })
})
