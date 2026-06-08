import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { HarnessError } from '../../packages/acp-harness/src/errors.js'
import {
  createFixtureRegistry,
  repositoryRoot,
} from '../helpers/acp-fixture.js'

describe('TargetRegistry security boundary', () => {
  it('rejects an unknown browser-provided target ID', async () => {
    const registry = await createFixtureRegistry()

    await expect(
      registry.resolve({ targetId: 'shell', workspaceRoot: repositoryRoot })
    ).rejects.toMatchObject<HarnessError>({ code: 'UNKNOWN_TARGET' })
  })

  it('rejects arbitrary arguments and environment variables', async () => {
    const registry = await createFixtureRegistry()

    await expect(
      registry.resolve({
        targetId: 'fixture-agent',
        workspaceRoot: repositoryRoot,
        args: ['-e', 'process.exit()'],
      })
    ).rejects.toMatchObject<HarnessError>({ code: 'ARGUMENT_NOT_ALLOWED' })

    await expect(
      registry.resolve({
        targetId: 'fixture-agent',
        workspaceRoot: repositoryRoot,
        environment: { NODE_OPTIONS: '--inspect' },
      })
    ).rejects.toMatchObject<HarnessError>({ code: 'ENVIRONMENT_NOT_ALLOWED' })
  })

  it('rejects a workspace outside the configured realpath roots', async () => {
    const registry = await createFixtureRegistry()

    await expect(
      registry.resolve({ targetId: 'fixture-agent', workspaceRoot: tmpdir() })
    ).rejects.toMatchObject<HarnessError>({ code: 'WORKSPACE_NOT_ALLOWED' })
  })

  it('resolves only fixed command data plus allowlisted values', async () => {
    const registry = await createFixtureRegistry()
    const resolved = await registry.resolve({
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
      args: ['--crash-after-initialize'],
      environment: { PATH: '/usr/bin' },
    })

    expect(resolved.command).toBe(process.execPath)
    expect(resolved.args.at(-1)).toBe('--crash-after-initialize')
    expect(resolved.environment).toEqual({ PATH: '/usr/bin' })
  })
})
