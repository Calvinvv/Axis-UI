import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
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

describe('Harness ↔ official SDK ↔ fixture contract', () => {
  it('starts an allowlisted stdio agent and completes ACP initialize', async () => {
    const harness = new AcpHarness(await createFixtureRegistry())
    harnesses.push(harness)
    const target = await harness.startTarget({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
    })

    const initialized = await harness.initialize(target.id)

    expect(initialized.response.protocolVersion).toBe(PROTOCOL_VERSION)
    expect(initialized.response.agentInfo?.name).toBe(
      'axis-deterministic-fixture'
    )
    await harness.stopTarget(target.id)
    expect(harness.processes.list()).toHaveLength(0)
  })

  it('observes agent crash and removes the process without an orphan handle', async () => {
    const harness = new AcpHarness(await createFixtureRegistry())
    harnesses.push(harness)
    const target = await harness.startTarget({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
      args: ['--crash-after-initialize'],
    })

    await harness.initialize(target.id)
    const exit = await target.exited

    expect(exit).toEqual({ code: 17, signal: null })
    expect(harness.processes.list()).toHaveLength(0)
  })
})
