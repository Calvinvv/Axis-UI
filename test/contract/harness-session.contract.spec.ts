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
  timeoutMs = 2_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error('Timed out waiting for condition')
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

async function startHarness(args: readonly string[] = []): Promise<{
  harness: AcpHarness
  targetId: string
}> {
  const harness = new AcpHarness(await createFixtureRegistry())
  harnesses.push(harness)
  const target = await harness.startTarget({
    targetId: 'fixture-agent',
    workspaceRoot: repositoryRoot,
    args,
  })
  await harness.initialize(target.id)
  return { harness, targetId: target.id }
}

describe('Harness session lifecycle contract', () => {
  it('reduces session/new, streaming update and prompt completion', async () => {
    const { harness, targetId } = await startHarness()
    const session = await harness.createSession(targetId)

    const submission = await harness.submitPrompt({
      targetHandleId: targetId,
      sessionId: session.sessionId,
      text: 'reply deterministically',
    })
    expect(submission.sessionId).toBe(session.sessionId)
    await expect(
      harness.submitPrompt({
        targetHandleId: targetId,
        sessionId: session.sessionId,
        text: 'must not overlap',
      })
    ).rejects.toMatchObject({ code: 'SESSION_BUSY' })
    await waitFor(
      () => harness.getSession(session.sessionId)?.status === 'completed'
    )

    const state = harness.getSession(session.sessionId)
    expect(state).toMatchObject({
      status: 'completed',
      stopReason: 'end_turn',
    })
    expect(state?.messages['message-1']?.chunks).toEqual([
      { type: 'text', text: 'fixture response' },
    ])

    await harness.submitPrompt({
      targetHandleId: targetId,
      sessionId: session.sessionId,
      text: 'continue the same session',
    })
    await waitFor(
      () =>
        harness.getSession(session.sessionId)?.status === 'completed' &&
        harness.getSession(session.sessionId)?.messages['message-1']?.chunks
          .length === 2
    )

    expect(harness.trace.map(frame => frame.method)).toContain('session/new')
    expect(harness.trace.map(frame => frame.method)).toContain('session/prompt')
  })

  it('cancels the prompt and every pending permission together', async () => {
    const { harness, targetId } = await startHarness(['--permission-prompt'])
    const session = await harness.createSession(targetId)
    await harness.submitPrompt({
      targetHandleId: targetId,
      sessionId: session.sessionId,
      text: 'request permission',
    })
    await waitFor(
      () =>
        Object.keys(
          harness.getSession(session.sessionId)?.pendingPermissions ?? {}
        ).length === 1
    )
    const permissionId = Object.keys(
      harness.getSession(session.sessionId)?.pendingPermissions ?? {}
    )[0]
    expect(permissionId).toBeDefined()
    if (permissionId === undefined) throw new Error('Permission ID is missing')
    expect(() =>
      harness.respondPermission({
        targetHandleId: targetId,
        sessionId: session.sessionId,
        permissionId,
        outcome: { outcome: 'selected', optionId: 'not-allowlisted' },
      })
    ).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_PERMISSION_OPTION' })
    )

    await harness.cancelSession(targetId, session.sessionId)
    await waitFor(
      () => harness.getSession(session.sessionId)?.status === 'cancelled'
    )

    const state = harness.getSession(session.sessionId)
    expect(state?.pendingPermissions).toEqual({})
    expect(state?.stopReason).toBe('cancelled')
    expect(state?.toolCalls['permission-tool']?.data.status).toBe('cancelled')
    expect(harness.trace).toContainEqual(
      expect.objectContaining({
        direction: 'client-to-agent',
        kind: 'notification',
        method: 'session/cancel',
      })
    )
    expect(
      harness.trace.some(
        frame =>
          frame.direction === 'client-to-agent' &&
          frame.kind === 'response' &&
          frame.raw.includes('cancelled')
      )
    ).toBe(true)
  })

  it('converges an in-flight prompt to crashed when the agent exits', async () => {
    const { harness, targetId } = await startHarness(['--crash-during-prompt'])
    const target = harness.processes.get(targetId)
    const session = await harness.createSession(targetId)
    await harness.submitPrompt({
      targetHandleId: targetId,
      sessionId: session.sessionId,
      text: 'crash now',
    })

    expect(await target.exited).toEqual({ code: 17, signal: null })
    await waitFor(
      () => harness.getSession(session.sessionId)?.status === 'crashed'
    )

    expect(harness.getSession(session.sessionId)).toMatchObject({
      status: 'crashed',
      pendingPermissions: {},
    })
  })
})
