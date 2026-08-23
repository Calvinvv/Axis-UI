import {
  createTranscript,
  type AxisAcpTranscript,
  type Diagnostic,
  type SessionStateSnapshot,
} from '@axis-ui/acp-core'
import { AcpHarness } from './harness.js'
import { evaluateLifecycleInvariants } from './invariants.js'
import {
  clientProfiles,
  type ClientCapabilityProfile,
  type ClientProfileId,
} from './client-profiles.js'
import { TargetRegistry } from './target-registry.js'

export type CoreScenarioId =
  | 'normal-prompt-turn'
  | 'cancel-during-permission'
  | 'capability-method-mismatch'

export interface ScenarioDefinition {
  readonly id: CoreScenarioId
  readonly profileId: ClientProfileId
  readonly targetArgs: readonly string[]
  readonly prompt: string
  readonly flow: 'complete' | 'cancel-on-permission'
  readonly expectedDiagnosticIds: readonly string[]
  readonly faultInjectionIds: readonly string[]
}

export interface ScenarioAssertionResult {
  readonly id: string
  readonly passed: boolean
  readonly message: string
}

export interface ScenarioReport {
  readonly runId: string
  readonly scenarioId: CoreScenarioId
  readonly status: 'passed' | 'failed'
  readonly profile: ClientCapabilityProfile
  readonly assertions: readonly ScenarioAssertionResult[]
  readonly diagnostics: readonly Diagnostic[]
  readonly stateSnapshots: readonly SessionStateSnapshot[]
  readonly transcript: AxisAcpTranscript
  readonly traceCount: number
  readonly eventCount: number
}

export function scenario(
  definition: ScenarioDefinition
): Readonly<ScenarioDefinition> {
  return Object.freeze({ ...definition })
}

export const coreScenarios: Readonly<
  Record<CoreScenarioId, ScenarioDefinition>
> = Object.freeze({
  'normal-prompt-turn': scenario({
    id: 'normal-prompt-turn',
    profileId: 'minimal',
    targetArgs: [],
    prompt: 'Return a deterministic streaming response.',
    flow: 'complete',
    expectedDiagnosticIds: [],
    faultInjectionIds: [],
  }),
  'cancel-during-permission': scenario({
    id: 'cancel-during-permission',
    profileId: 'permission-only',
    targetArgs: ['--permission-prompt'],
    prompt: 'Request permission before running the deterministic command.',
    flow: 'cancel-on-permission',
    expectedDiagnosticIds: [],
    faultInjectionIds: ['permission-pending'],
  }),
  'capability-method-mismatch': scenario({
    id: 'capability-method-mismatch',
    profileId: 'minimal',
    targetArgs: ['--capability-method-mismatch'],
    prompt: 'Attempt the deterministic unsupported terminal call.',
    flow: 'complete',
    expectedDiagnosticIds: ['omitted-capability-is-unsupported'],
    faultInjectionIds: ['unsupported-terminal-request'],
  }),
})

export interface ScenarioRunnerOptions {
  readonly registry: TargetRegistry
  readonly targetId: string
  readonly workspaceRoot: string
  readonly timeoutMs?: number
}

export class ScenarioRunner {
  private readonly timeoutMs: number

  constructor(private readonly options: ScenarioRunnerOptions) {
    this.timeoutMs = options.timeoutMs ?? 2_000
  }

  async run(definition: ScenarioDefinition): Promise<ScenarioReport> {
    const startedAt = new Date().toISOString()
    const harness = new AcpHarness(this.options.registry)
    const profile = clientProfiles[definition.profileId]
    const assertions: ScenarioAssertionResult[] = []
    let harnessFailure: Diagnostic | undefined
    let sessionId: string | undefined

    try {
      const target = await harness.startTarget({
        targetId: this.options.targetId,
        workspaceRoot: this.options.workspaceRoot,
        args: definition.targetArgs,
      })
      await harness.initialize(target.id, profile)
      const session = await harness.createSession(target.id)
      const activeSessionId = session.sessionId
      sessionId = activeSessionId
      await harness.submitPrompt({
        targetHandleId: target.id,
        sessionId: activeSessionId,
        text: definition.prompt,
      })

      if (definition.flow === 'cancel-on-permission') {
        await this.waitFor(
          () =>
            Object.keys(
              harness.getSession(activeSessionId)?.pendingPermissions ?? {}
            ).length > 0,
          'permission request'
        )
        await harness.cancelSession(target.id, activeSessionId)
      }

      await this.waitFor(() => {
        const status = harness.getSession(activeSessionId)?.status
        return (
          status === 'completed' ||
          status === 'cancelled' ||
          status === 'failed' ||
          status === 'crashed'
        )
      }, 'session terminal state')
      await harness.stopTarget(target.id)
    } catch (error) {
      harnessFailure = this.harnessFailure(harness.runId, definition, error)
    } finally {
      await harness.dispose()
    }

    const finalState =
      sessionId === undefined ? undefined : harness.getSession(sessionId)
    const stateSnapshots = harness.stateSnapshots

    assertions.push(...this.assert(definition, finalState))
    const context = {
      runId: harness.runId,
      scenarioId: definition.id,
      profile: {
        id: profile.id,
        capabilities: profile.capabilities,
        allowedClientMethods: profile.allowedClientMethods,
      },
      trace: harness.trace,
      events: harness.events,
      stateSnapshots,
      activeProcessCount: harness.processes.list().length,
      faultInjectionIds: definition.faultInjectionIds,
    }
    const diagnostics = [
      ...evaluateLifecycleInvariants(context),
      ...this.assertionDiagnostics(context, assertions),
      ...(harnessFailure === undefined ? [] : [harnessFailure]),
    ]
    const unexpectedErrors = diagnostics.filter(
      item =>
        (item.severity === 'error' || item.severity === 'fatal') &&
        !definition.expectedDiagnosticIds.includes(item.invariantId)
    )
    const expectedDiagnosticsPresent = definition.expectedDiagnosticIds.every(
      id => diagnostics.some(item => item.invariantId === id)
    )
    const capabilitySnapshot = harness.events.find(
      event => event.type === 'capability/snapshot'
    )
    const transcript = await createTranscript(
      {
        run: {
          id: harness.runId,
          scenarioId: definition.id,
          startedAt,
          completedAt: new Date().toISOString(),
          toolkitVersion: '0.0.0',
          protocolVersion: 'v1',
        },
        target: {
          id: this.options.targetId,
          transport: 'stdio',
          protocolVersion: 'v1',
          args: definition.targetArgs,
          agentInfo: capabilitySnapshot?.agentInfo,
        },
        clientProfile: {
          id: profile.id,
          capabilities: profile.capabilities,
          allowedClientMethods: profile.allowedClientMethods,
        },
        rawFrames: harness.trace,
        events: harness.events,
        assertions,
        diagnostics,
      },
      {
        secretValues: [this.options.workspaceRoot],
        explicitPaths: [
          'rawFrames.*.parsed.params.prompt',
          'rawFrames.*.raw.$json.params.prompt',
        ],
      }
    )

    return {
      runId: harness.runId,
      scenarioId: definition.id,
      status:
        unexpectedErrors.length === 0 && expectedDiagnosticsPresent
          ? 'passed'
          : 'failed',
      profile,
      assertions,
      diagnostics,
      stateSnapshots,
      transcript,
      traceCount: harness.trace.length,
      eventCount: harness.events.length,
    }
  }

  private assert(
    definition: ScenarioDefinition,
    state: SessionStateSnapshot['state'] | undefined
  ): readonly ScenarioAssertionResult[] {
    const expectedStatus =
      definition.flow === 'cancel-on-permission' ? 'cancelled' : 'completed'
    return [
      {
        id: 'session-status',
        passed: state?.status === expectedStatus,
        message: `Expected ${expectedStatus}, received ${state?.status ?? 'missing'}`,
      },
      {
        id: 'no-pending-permissions',
        passed:
          state !== undefined &&
          Object.keys(state.pendingPermissions).length === 0,
        message: 'The final session state must not contain pending permissions',
      },
    ]
  }

  private assertionDiagnostics(
    context: {
      readonly runId: string
      readonly scenarioId: string
      readonly stateSnapshots: readonly SessionStateSnapshot[]
      readonly faultInjectionIds: readonly string[]
    },
    assertions: readonly ScenarioAssertionResult[]
  ): readonly Diagnostic[] {
    return assertions
      .filter(assertion => !assertion.passed)
      .map(assertion => ({
        id: `${context.runId}:assertion:${assertion.id}`,
        kind: 'scenario-assertion-failure',
        runId: context.runId,
        scenarioId: context.scenarioId,
        invariantId: assertion.id,
        severity: 'error',
        subject: 'unknown',
        message: assertion.message,
        traceIds: [],
        stateSnapshotIds: context.stateSnapshots.map(snapshot => snapshot.id),
        faultInjectionIds: context.faultInjectionIds,
        references: [],
      }))
  }

  private harnessFailure(
    runId: string,
    definition: ScenarioDefinition,
    error: unknown
  ): Diagnostic {
    return {
      id: `${runId}:harness-failure`,
      kind: 'harness-failure',
      runId,
      scenarioId: definition.id,
      invariantId: 'scenario-runner-completed',
      severity: 'fatal',
      subject: 'harness',
      message: error instanceof Error ? error.message : String(error),
      traceIds: [],
      stateSnapshotIds: [],
      faultInjectionIds: definition.faultInjectionIds,
      references: [],
    }
  }

  private async waitFor(
    predicate: () => boolean,
    description: string
  ): Promise<void> {
    const deadline = Date.now() + this.timeoutMs
    while (!predicate()) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${description}`)
      }
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  }
}
