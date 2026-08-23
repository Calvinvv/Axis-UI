import type {
  InitializeResponse,
  RequestPermissionOutcome,
} from '@agentclientprotocol/sdk'

export type ProtocolVersion = 'v1'

export interface TargetDefinition {
  readonly id: string
  readonly command: string
  readonly fixedArgs?: readonly string[]
  readonly allowedArgs: readonly string[]
  readonly environmentAllowlist: readonly string[]
  readonly maxProcesses: number
  readonly expectedProtocolVersion: ProtocolVersion
}

export interface TargetStartRequest {
  readonly targetId: string
  readonly workspaceRoot: string
  readonly args?: readonly string[]
  readonly environment?: Readonly<Record<string, string>>
}

export interface ResolvedTarget {
  readonly definition: TargetDefinition
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly environment: NodeJS.ProcessEnv
}

export type TargetExit = {
  readonly code: number | null
  readonly signal: NodeJS.Signals | null
}

export interface TargetHandle {
  readonly id: string
  readonly targetId: string
  readonly pid: number
  readonly cwd: string
  readonly stderr: readonly string[]
  readonly exited: Promise<TargetExit>
}

export interface HarnessInitialization {
  readonly targetHandleId: string
  readonly response: InitializeResponse
}

export interface SessionIdentity {
  readonly targetHandleId: string
  readonly sessionId: string
}

export interface PromptInput {
  readonly targetHandleId: string
  readonly sessionId: string
  readonly text: string
}

export interface PromptSubmission {
  readonly turnId: string
  readonly sessionId: string
}

export interface PermissionDecision {
  readonly targetHandleId: string
  readonly sessionId: string
  readonly permissionId: string
  readonly outcome: RequestPermissionOutcome
}
