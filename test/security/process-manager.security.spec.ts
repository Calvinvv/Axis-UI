import { describe, expect, it } from 'vitest'
import { ProcessManager } from '../../packages/acp-harness/src/process-manager.js'
import type { ResolvedTarget } from '../../packages/acp-harness/src/types.js'
import { fixtureTarget, repositoryRoot } from '../helpers/acp-fixture.js'

function hangingTarget(): ResolvedTarget {
  return {
    definition: { ...fixtureTarget, id: 'hanging', maxProcesses: 1 },
    command: process.execPath,
    args: ['-e', 'setInterval(() => {}, 1000)'],
    cwd: repositoryRoot,
    environment: {},
  }
}

describe('ProcessManager resource boundary', () => {
  it('enforces per-target and global quotas', async () => {
    const manager = new ProcessManager({ maxProcesses: 1 })
    const first = manager.start(hangingTarget())

    expect(() => manager.start(hangingTarget())).toThrowError(
      expect.objectContaining({ code: 'GLOBAL_PROCESS_LIMIT' })
    )

    await manager.stop(first.id)
    expect(manager.list()).toHaveLength(0)
  })

  it('terminates the isolated process group and removes the handle', async () => {
    const manager = new ProcessManager({ gracefulShutdownMs: 100 })
    const target = manager.start(hangingTarget())

    const exit = await manager.stop(target.id)

    expect(exit.signal).toMatch(/^SIG(?:TERM|KILL)$/u)
    expect(manager.list()).toHaveLength(0)
    if (process.platform !== 'win32') {
      expect(() => process.kill(target.pid, 0)).toThrowError(
        expect.objectContaining({ code: 'ESRCH' })
      )
    }
  })
})
