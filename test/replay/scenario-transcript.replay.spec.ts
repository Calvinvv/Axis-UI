import {
  serializeTranscript,
  stateHash,
  TranscriptReplay,
} from '@axis-ui/acp-core'
import { describe, expect, it } from 'vitest'
import {
  coreScenarios,
  ScenarioRunner,
} from '../../packages/acp-harness/src/scenario.js'
import {
  createFixtureRegistry,
  repositoryRoot,
} from '../helpers/acp-fixture.js'

describe('Scenario transcript integration', () => {
  it('replays recorded facts to the same live session state hash', async () => {
    const runner = new ScenarioRunner({
      registry: await createFixtureRegistry(),
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
    })
    const report = await runner.run(coreScenarios['normal-prompt-turn'])
    const finalSnapshot = report.stateSnapshots.at(-1)
    expect(finalSnapshot).toBeDefined()

    const replay = TranscriptReplay.from(serializeTranscript(report.transcript))
    const replayed = replay.playToEnd()
    const sessionId = finalSnapshot?.state.sessionId ?? ''

    expect(replayed.states[sessionId]).toEqual(finalSnapshot?.state)
    expect(report.transcript.integrity.stateHashes[sessionId]).toBe(
      await stateHash(finalSnapshot?.state)
    )
    expect(await replay.verifyIntegrity()).toBe(true)
    expect(serializeTranscript(report.transcript)).not.toContain(repositoryRoot)
  })

  it('preserves Raw Frame links while replaying semantic events only', async () => {
    const runner = new ScenarioRunner({
      registry: await createFixtureRegistry(),
      targetId: 'fixture-agent',
      workspaceRoot: repositoryRoot,
    })
    const report = await runner.run(coreScenarios['cancel-during-permission'])
    const traceIds = new Set(report.transcript.rawFrames.map(frame => frame.id))
    const linkedEvents = report.transcript.events.filter(
      event => event.sourceTraceIds.length > 0
    )

    expect(linkedEvents.length).toBeGreaterThan(0)
    expect(
      linkedEvents.every(event =>
        event.sourceTraceIds.every(traceId => traceIds.has(traceId))
      )
    ).toBe(true)

    const replay = new TranscriptReplay(report.transcript)
    expect(replay.seek(0).states).toEqual({})
    expect(replay.playToEnd().states).not.toEqual({})
  })
})
