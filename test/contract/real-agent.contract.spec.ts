import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AcpHarness } from '../../packages/acp-harness/src/harness.js'
import { createOpenCodeTarget } from '../../packages/acp-harness/src/registry-targets.js'
import { TargetRegistry } from '../../packages/acp-harness/src/target-registry.js'
import { repositoryRoot } from '../helpers/acp-fixture.js'

const openCodePath =
  process.env.AXIS_OPENCODE_PATH ?? '/opt/homebrew/bin/opencode'

describe.skipIf(!existsSync(openCodePath))('OpenCode real ACP agent', () => {
  it('negotiates initialize and records a capability snapshot without a model turn', async () => {
    const registry = await TargetRegistry.create(
      [createOpenCodeTarget(openCodePath)],
      [repositoryRoot]
    )
    const harness = new AcpHarness(registry)

    try {
      const target = await harness.startTarget({
        targetId: 'opencode',
        workspaceRoot: repositoryRoot,
      })
      const initialization = await harness.initialize(target.id)

      expect(initialization.response.protocolVersion).toBe(1)
      expect(harness.trace).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'request', method: 'initialize' }),
          expect.objectContaining({ kind: 'response' }),
        ])
      )
      expect(harness.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'capability/snapshot' }),
        ])
      )

      await harness.stopTarget(target.id)
      expect(harness.processes.list()).toEqual([])
    } finally {
      await harness.dispose()
    }
  }, 15_000)
})
