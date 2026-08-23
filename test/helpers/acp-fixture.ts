import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TargetRegistry,
  type TargetDefinition,
} from '../../packages/acp-harness/src/index.js'

export const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url))
)

export const fixtureAgentPath = resolve(
  repositoryRoot,
  'fixtures/acp-agents/bin/fixture-agent.mjs'
)

export const fixtureTarget: TargetDefinition = {
  id: 'fixture-agent',
  command: process.execPath,
  fixedArgs: [fixtureAgentPath],
  allowedArgs: [
    '--crash-after-initialize',
    '--stdout-noise',
    '--stderr-marker',
    '--permission-prompt',
    '--crash-during-prompt',
    '--capability-method-mismatch',
  ],
  environmentAllowlist: ['PATH'],
  maxProcesses: 2,
  expectedProtocolVersion: 'v1',
}

export async function createFixtureRegistry(): Promise<TargetRegistry> {
  return TargetRegistry.create([fixtureTarget], [repositoryRoot])
}
