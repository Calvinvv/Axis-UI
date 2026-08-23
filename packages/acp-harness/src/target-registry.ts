import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { HarnessError } from './errors.js'
import type {
  ResolvedTarget,
  TargetDefinition,
  TargetStartRequest,
} from './types.js'

function isInsideRoot(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return (
    pathFromRoot === '' ||
    (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))
  )
}

export class TargetRegistry {
  private readonly definitions = new Map<string, TargetDefinition>()

  private constructor(
    private readonly allowedWorkspaceRoots: readonly string[]
  ) {}

  static async create(
    definitions: readonly TargetDefinition[],
    allowedWorkspaceRoots: readonly string[]
  ): Promise<TargetRegistry> {
    if (allowedWorkspaceRoots.length === 0) {
      throw new HarnessError(
        'At least one allowed workspace root is required',
        'WORKSPACE_ROOTS_EMPTY'
      )
    }

    const normalizedRoots = await Promise.all(
      allowedWorkspaceRoots.map(async root => realpath(resolve(root)))
    )
    const registry = new TargetRegistry(normalizedRoots)
    for (const definition of definitions) registry.register(definition)
    return registry
  }

  list(): readonly TargetDefinition[] {
    return [...this.definitions.values()]
  }

  get(targetId: string): TargetDefinition {
    const definition = this.definitions.get(targetId)
    if (!definition) {
      throw new HarnessError(`Unknown target ID: ${targetId}`, 'UNKNOWN_TARGET')
    }
    return definition
  }

  async resolve(request: TargetStartRequest): Promise<ResolvedTarget> {
    const definition = this.get(request.targetId)
    const requestedArgs = request.args ?? []

    for (const arg of requestedArgs) {
      if (!definition.allowedArgs.includes(arg)) {
        throw new HarnessError(
          `Argument is not allowed for target ${definition.id}: ${arg}`,
          'ARGUMENT_NOT_ALLOWED'
        )
      }
    }

    const cwd = await realpath(resolve(request.workspaceRoot))
    if (!this.allowedWorkspaceRoots.some(root => isInsideRoot(root, cwd))) {
      throw new HarnessError(
        `Workspace is outside the allowed roots: ${cwd}`,
        'WORKSPACE_NOT_ALLOWED'
      )
    }

    const environment: NodeJS.ProcessEnv = {}
    for (const key of definition.environmentAllowlist) {
      const value = request.environment?.[key] ?? process.env[key]
      if (value !== undefined) environment[key] = value
    }
    for (const key of Object.keys(request.environment ?? {})) {
      if (!definition.environmentAllowlist.includes(key)) {
        throw new HarnessError(
          `Environment variable is not allowed for target ${definition.id}: ${key}`,
          'ENVIRONMENT_NOT_ALLOWED'
        )
      }
    }

    return {
      definition,
      command: definition.command,
      args: [...(definition.fixedArgs ?? []), ...requestedArgs],
      cwd,
      environment,
    }
  }

  private register(definition: TargetDefinition): void {
    if (!definition.id || this.definitions.has(definition.id)) {
      throw new HarnessError(
        `Target ID must be non-empty and unique: ${definition.id}`,
        'INVALID_TARGET_DEFINITION'
      )
    }
    if (!isAbsolute(definition.command)) {
      throw new HarnessError(
        `Target command must be absolute: ${definition.command}`,
        'INVALID_TARGET_COMMAND'
      )
    }
    if (definition.maxProcesses < 1) {
      throw new HarnessError(
        `Target maxProcesses must be positive: ${definition.id}`,
        'INVALID_TARGET_LIMIT'
      )
    }
    this.definitions.set(definition.id, Object.freeze({ ...definition }))
  }
}
