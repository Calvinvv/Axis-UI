import { accessSync, constants } from 'node:fs'
import { delimiter, isAbsolute, join } from 'node:path'
import { HarnessError } from './errors.js'
import type { TargetDefinition } from './types.js'

export function findExecutable(
  executable: string,
  searchPath: string | undefined = process.env.PATH
): string | undefined {
  if (isAbsolute(executable))
    return canExecute(executable) ? executable : undefined
  for (const directory of searchPath?.split(delimiter) ?? []) {
    const candidate = join(directory, executable)
    if (canExecute(candidate)) return candidate
  }
  return undefined
}

export function createOpenCodeTarget(command: string): TargetDefinition {
  if (!isAbsolute(command)) {
    throw new HarnessError(
      `OpenCode command must be absolute: ${command}`,
      'INVALID_TARGET_COMMAND'
    )
  }
  return {
    id: 'opencode',
    command,
    fixedArgs: ['acp', '--pure'],
    allowedArgs: [],
    environmentAllowlist: ['PATH'],
    maxProcesses: 1,
    expectedProtocolVersion: 'v1',
  }
}

function canExecute(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}
