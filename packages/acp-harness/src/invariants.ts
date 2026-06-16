import type {
  Diagnostic,
  DiagnosticKind,
  DiagnosticSubject,
  InvariantRunContext,
  LifecycleInvariant,
  NormativeReference,
  ProtocolTraceFrame,
} from '@axis-ui/acp-core'

const jsonRpcReference: NormativeReference = {
  standard: 'JSON-RPC',
  section: 'Request Object, Notification and Response Object',
  url: 'https://www.jsonrpc.org/specification',
  requirement: 'MUST',
}

const transportReference: NormativeReference = {
  standard: 'ACP',
  protocolVersion: 1,
  section: 'Transports / stdio',
  url: 'https://agentclientprotocol.com/protocol/v1/transports',
  requirement: 'MUST NOT',
}

const capabilityReference: NormativeReference = {
  standard: 'ACP',
  protocolVersion: 1,
  section: 'Initialization / Client Capabilities',
  url: 'https://agentclientprotocol.com/protocol/v1/initialization',
  requirement: 'MUST',
}

const cancelPermissionReference: NormativeReference = {
  standard: 'ACP',
  protocolVersion: 1,
  section: 'Prompt Turn / Cancellation',
  url: 'https://agentclientprotocol.com/protocol/v1/prompt-turn#cancellation',
  requirement: 'MUST',
}

const cancelledStopReference: NormativeReference = {
  ...cancelPermissionReference,
  section: 'Prompt Turn / Cancelled Stop Reason',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function oppositeDirection(
  frame: ProtocolTraceFrame
): ProtocolTraceFrame['direction'] {
  return frame.direction === 'agent-to-client'
    ? 'client-to-agent'
    : 'agent-to-client'
}

function matchingRequest(
  trace: InvariantRunContext['trace'],
  response: ProtocolTraceFrame
): ProtocolTraceFrame | undefined {
  if (response.requestId === null || response.requestId === undefined) {
    return undefined
  }
  return trace.find(
    request =>
      request.sequence < response.sequence &&
      request.kind === 'request' &&
      request.direction === oppositeDirection(response) &&
      request.requestId === response.requestId
  )
}

function diagnostic(
  context: InvariantRunContext,
  invariant: LifecycleInvariant,
  input: {
    readonly kind: DiagnosticKind
    readonly severity: Diagnostic['severity']
    readonly subject: DiagnosticSubject
    readonly message: string
    readonly sequence?: number
    readonly traceIds?: readonly string[]
  }
): Diagnostic {
  const snapshots = evidenceSnapshots(context.stateSnapshots, input.sequence)
  return {
    id: `${context.runId}:${invariant.id}:${input.sequence ?? 'run'}`,
    kind: input.kind,
    runId: context.runId,
    scenarioId: context.scenarioId,
    invariantId: invariant.id,
    severity: input.severity,
    subject: input.subject,
    message: input.message,
    sequence: input.sequence,
    traceIds: input.traceIds ?? [],
    stateSnapshotIds: snapshots.map(snapshot => snapshot.id),
    faultInjectionIds: context.faultInjectionIds,
    references: invariant.references,
  }
}

function evidenceSnapshots(
  snapshots: InvariantRunContext['stateSnapshots'],
  sequence?: number
): InvariantRunContext['stateSnapshots'] {
  if (sequence === undefined) {
    const last = snapshots.at(-1)
    return last === undefined ? [] : [last]
  }
  const before = [...snapshots]
    .reverse()
    .find(snapshot => snapshot.sequence <= sequence)
  const after = snapshots.find(snapshot => snapshot.sequence >= sequence)
  if (before === undefined) return after === undefined ? [] : [after]
  if (after === undefined || after.id === before.id) return [before]
  return [before, after]
}

const responseCorrelation: LifecycleInvariant = {
  id: 'jsonrpc-response-correlation',
  category: 'protocol',
  description: 'Every non-null response ID must match an earlier request.',
  references: [jsonRpcReference],
  evaluate(context) {
    return context.trace
      .filter(frame => frame.kind === 'response' && frame.requestId !== null)
      .filter(
        response => matchingRequest(context.trace, response) === undefined
      )
      .map(response =>
        diagnostic(context, responseCorrelation, {
          kind: 'protocol-violation',
          severity: 'error',
          subject:
            response.direction === 'agent-to-client' ? 'agent' : 'harness',
          message: `Response ID ${String(response.requestId)} has no matching request`,
          sequence: response.sequence,
          traceIds: [response.id],
        })
      )
  },
}

const notificationResponse: LifecycleInvariant = {
  id: 'notification-must-not-have-response',
  category: 'protocol',
  description:
    'A response without request correlation must not be emitted for a notification.',
  references: [jsonRpcReference],
  evaluate(context) {
    return context.trace
      .filter(frame => frame.kind === 'response')
      .flatMap(response => {
        if (matchingRequest(context.trace, response) !== undefined) return []
        const precedingInput = [...context.trace]
          .reverse()
          .find(
            frame =>
              frame.sequence < response.sequence &&
              frame.direction === oppositeDirection(response)
          )
        if (precedingInput?.kind !== 'notification') return []
        return [
          diagnostic(context, notificationResponse, {
            kind: 'protocol-violation',
            severity: 'error',
            subject:
              response.direction === 'agent-to-client' ? 'agent' : 'harness',
            message: `Response has no request correlation and follows notification ${precedingInput.method ?? '(unknown)'}`,
            sequence: response.sequence,
            traceIds: [precedingInput.id, response.id],
          }),
        ]
      })
  },
}

const validStdout: LifecycleInvariant = {
  id: 'stdio-stdout-valid-acp-only',
  category: 'protocol',
  description: 'Agent stdout must contain only valid ACP messages.',
  references: [transportReference],
  evaluate(context) {
    return context.trace
      .filter(
        frame =>
          frame.direction === 'agent-to-client' &&
          (frame.kind === 'invalid-json' || frame.kind === 'stdout-noise')
      )
      .map(frame =>
        diagnostic(context, validStdout, {
          kind: 'protocol-violation',
          severity: 'error',
          subject: 'agent',
          message: `Agent stdout contains ${frame.kind}: ${frame.raw.slice(0, 80)}`,
          sequence: frame.sequence,
          traceIds: [frame.id],
        })
      )
  },
}

const omittedCapability: LifecycleInvariant = {
  id: 'omitted-capability-is-unsupported',
  category: 'capability-contract',
  description: 'Omitted client capabilities must be treated as unsupported.',
  references: [capabilityReference],
  evaluate(context) {
    const capabilities = context.profile.capabilities
    return context.trace
      .filter(
        frame =>
          frame.direction === 'agent-to-client' && frame.kind === 'request'
      )
      .filter(frame => {
        if (frame.method?.startsWith('terminal/')) {
          return capabilities.terminal !== true
        }
        if (frame.method === 'fs/read_text_file') {
          return (
            !isRecord(capabilities.fs) || capabilities.fs.readTextFile !== true
          )
        }
        if (frame.method === 'fs/write_text_file') {
          return (
            !isRecord(capabilities.fs) || capabilities.fs.writeTextFile !== true
          )
        }
        return false
      })
      .map(frame =>
        diagnostic(context, omittedCapability, {
          kind: 'capability-contract-mismatch',
          severity: 'error',
          subject: 'agent',
          message: `Agent called ${frame.method} although the capability was omitted`,
          sequence: frame.sequence,
          traceIds: [frame.id],
        })
      )
  },
}

const cancelPendingPermission: LifecycleInvariant = {
  id: 'cancel-pending-permission-response',
  category: 'protocol',
  description: 'Pending permission requests must be cancelled with the turn.',
  references: [cancelPermissionReference],
  evaluate(context) {
    const cancel = context.trace.find(
      frame =>
        frame.direction === 'client-to-agent' &&
        frame.kind === 'notification' &&
        frame.method === 'session/cancel'
    )
    if (!cancel) return []

    return context.trace
      .filter(
        frame =>
          frame.direction === 'agent-to-client' &&
          frame.kind === 'request' &&
          frame.method === 'session/request_permission' &&
          frame.sequence < cancel.sequence
      )
      .filter(permission => {
        const response = context.trace.find(
          frame =>
            frame.direction === 'client-to-agent' &&
            frame.kind === 'response' &&
            frame.requestId === permission.requestId
        )
        if (response !== undefined && response.sequence < cancel.sequence) {
          return false
        }
        return response === undefined || !response.raw.includes('cancelled')
      })
      .map(permission =>
        diagnostic(context, cancelPendingPermission, {
          kind: 'protocol-violation',
          severity: 'error',
          subject: 'harness',
          message: 'Pending permission was not answered with cancelled',
          sequence: cancel.sequence,
          traceIds: [permission.id, cancel.id],
        })
      )
  },
}

const cancelledStopReason: LifecycleInvariant = {
  id: 'cancelled-stop-reason',
  category: 'protocol',
  description: 'A cancelled prompt turn must finish with cancelled StopReason.',
  references: [cancelledStopReference],
  evaluate(context) {
    const cancel = context.trace.find(
      frame =>
        frame.direction === 'client-to-agent' &&
        frame.kind === 'notification' &&
        frame.method === 'session/cancel'
    )
    if (!cancel) return []
    const prompt = [...context.trace]
      .reverse()
      .find(
        frame =>
          frame.sequence < cancel.sequence &&
          frame.direction === 'client-to-agent' &&
          frame.kind === 'request' &&
          frame.method === 'session/prompt'
      )
    const response = context.trace.find(
      frame =>
        frame.sequence > cancel.sequence &&
        frame.direction === 'agent-to-client' &&
        frame.kind === 'response' &&
        frame.requestId === prompt?.requestId
    )
    const result = isRecord(response?.parsed)
      ? response.parsed.result
      : undefined
    const stopReason = isRecord(result) ? result.stopReason : undefined
    if (stopReason === 'cancelled') return []
    return [
      diagnostic(context, cancelledStopReason, {
        kind: 'protocol-violation',
        severity: 'error',
        subject: 'agent',
        message:
          'Agent did not finish the cancelled prompt with StopReason cancelled',
        sequence: response?.sequence ?? cancel.sequence,
        traceIds: [cancel.id, response?.id].filter(
          (id): id is string => id !== undefined
        ),
      }),
    ]
  },
}

const noOrphanProcess: LifecycleInvariant = {
  id: 'no-orphan-process-after-run',
  category: 'resource',
  description: 'A completed scenario must leave no managed target processes.',
  references: [],
  evaluate(context) {
    if (context.activeProcessCount === 0) return []
    return [
      diagnostic(context, noOrphanProcess, {
        kind: 'resource-leak',
        severity: 'error',
        subject: 'harness',
        message: `${context.activeProcessCount} managed process(es) remain after the run`,
      }),
    ]
  },
}

export const lifecycleInvariants: readonly LifecycleInvariant[] = Object.freeze(
  [
    responseCorrelation,
    notificationResponse,
    validStdout,
    omittedCapability,
    cancelPendingPermission,
    cancelledStopReason,
    noOrphanProcess,
  ]
)

export function evaluateLifecycleInvariants(
  context: InvariantRunContext
): readonly Diagnostic[] {
  return lifecycleInvariants.flatMap(invariant => invariant.evaluate(context))
}
