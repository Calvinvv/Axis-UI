import { afterEach, describe, expect, it } from 'vitest'
import { AcpHarness } from '../../packages/acp-harness/src/harness.js'
import {
  createFixtureRegistry,
  repositoryRoot,
} from '../helpers/acp-fixture.js'

const harnesses: AcpHarness[] = []

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map(harness => harness.dispose()))
})

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error('Timed out waiting for condition')
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

describe('Harness raw trace and semantic event contract', () => {
  it('correlates initialize frames with a normalized capability event', async () => {
    const harness = new AcpHarness(
      await createFixtureRegistry(),
      undefined,
      'trace-contract-run'
    )
    harnesses.push(harness)
    const target = await harness.startTarget({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
    })

    await harness.initialize(target.id)

    const request = harness.trace.find(
      frame => frame.direction === 'client-to-agent' && frame.kind === 'request'
    )
    const response = harness.trace.find(
      frame =>
        frame.direction === 'agent-to-client' && frame.kind === 'response'
    )
    const capabilities = harness.events.find(
      event => event.type === 'capability/snapshot'
    )

    expect(request).toMatchObject({
      runId: 'trace-contract-run',
      connectionId: target.id,
      method: 'initialize',
    })
    expect(response?.requestId).toBe(request?.requestId)
    expect(capabilities).toMatchObject({
      runId: 'trace-contract-run',
      connectionId: target.id,
      agentInfo: { name: 'axis-deterministic-fixture' },
      sourceTraceIds: [request?.id, response?.id],
    })

    const sequences = [...harness.trace, ...harness.events]
      .map(item => item.sequence)
      .sort((left, right) => left - right)
    expect(new Set(sequences).size).toBe(sequences.length)
    expect(sequences).toEqual(
      Array.from({ length: sequences.length }, (_, index) => index + 1)
    )
  })

  it('records invalid stdout even when the SDK continues with later frames', async () => {
    const harness = new AcpHarness(await createFixtureRegistry())
    harnesses.push(harness)
    const target = await harness.startTarget({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
      args: ['--stdout-noise'],
    })

    const initialized = await harness.initialize(target.id)

    expect(initialized.response.agentInfo?.name).toBe(
      'axis-deterministic-fixture'
    )
    expect(harness.trace).toContainEqual(
      expect.objectContaining({
        direction: 'agent-to-client',
        kind: 'invalid-json',
        raw: 'fixture stdout noise',
      })
    )
  })

  it('keeps agent stderr outside the ACP protocol ledger', async () => {
    const harness = new AcpHarness(await createFixtureRegistry())
    harnesses.push(harness)
    const target = await harness.startTarget({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
      args: ['--stderr-marker'],
    })

    await harness.initialize(target.id)
    await waitFor(() => target.stderr.includes('fixture stderr marker'))

    expect(target.stderr).toContain('fixture stderr marker')
    expect(
      harness.trace.every(frame => !frame.raw.includes('stderr marker'))
    ).toBe(true)
  })
})
