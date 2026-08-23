import { describe, expect, it } from 'vitest'
import {
  createFixtureRegistry,
  repositoryRoot,
} from '../helpers/acp-fixture.js'
import {
  coreScenarios,
  ScenarioRunner,
  type CoreScenarioId,
} from '../../packages/acp-harness/src/scenario.js'

describe('three fixed ACP scenarios', () => {
  it.each(Object.keys(coreScenarios) as CoreScenarioId[])(
    'runs %s deterministically',
    async scenarioId => {
      const runner = new ScenarioRunner({
        registry: await createFixtureRegistry(),
        targetId: 'fixture-agent',
        workspaceRoot: repositoryRoot,
      })

      const report = await runner.run(coreScenarios[scenarioId])

      expect(report.status).toBe('passed')
      expect(report.assertions.every(assertion => assertion.passed)).toBe(true)
      expect(report.traceCount).toBeGreaterThan(0)
      expect(report.eventCount).toBeGreaterThan(0)
      if (scenarioId === 'capability-method-mismatch') {
        expect(report.diagnostics).toContainEqual(
          expect.objectContaining({
            kind: 'capability-contract-mismatch',
            subject: 'agent',
            invariantId: 'omitted-capability-is-unsupported',
            faultInjectionIds: ['unsupported-terminal-request'],
            stateSnapshotIds: expect.arrayContaining([expect.any(String)]),
          })
        )
      } else {
        expect(report.diagnostics).toEqual([])
      }
    }
  )
})
