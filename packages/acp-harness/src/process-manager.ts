import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { HarnessError } from './errors.js'
import type { ResolvedTarget, TargetExit, TargetHandle } from './types.js'

export interface ManagedTarget extends TargetHandle {
  readonly child: ChildProcessWithoutNullStreams
}

export interface ProcessManagerOptions {
  readonly maxProcesses?: number
  readonly gracefulShutdownMs?: number
  readonly stderrLineLimit?: number
}

export class ProcessManager {
  private readonly processes = new Map<string, ManagedTarget>()
  private readonly perTargetCounts = new Map<string, number>()
  private readonly maxProcesses: number
  private readonly gracefulShutdownMs: number
  private readonly stderrLineLimit: number

  constructor(options: ProcessManagerOptions = {}) {
    this.maxProcesses = options.maxProcesses ?? 4
    this.gracefulShutdownMs = options.gracefulShutdownMs ?? 1_500
    this.stderrLineLimit = options.stderrLineLimit ?? 200
  }

  list(): readonly TargetHandle[] {
    return [...this.processes.values()]
  }

  get(handleId: string): ManagedTarget {
    const target = this.processes.get(handleId)
    if (!target) {
      throw new HarnessError(
        `Unknown target handle: ${handleId}`,
        'UNKNOWN_TARGET_HANDLE'
      )
    }
    return target
  }

  start(target: ResolvedTarget): ManagedTarget {
    if (this.processes.size >= this.maxProcesses) {
      throw new HarnessError(
        `Global process limit reached (${this.maxProcesses})`,
        'GLOBAL_PROCESS_LIMIT'
      )
    }

    const targetCount = this.perTargetCounts.get(target.definition.id) ?? 0
    if (targetCount >= target.definition.maxProcesses) {
      throw new HarnessError(
        `Process limit reached for target ${target.definition.id}`,
        'TARGET_PROCESS_LIMIT'
      )
    }

    const child = spawn(target.command, target.args, {
      cwd: target.cwd,
      env: target.environment,
      detached: process.platform !== 'win32',
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const id = randomUUID()
    const stderr: string[] = []
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr.push(...chunk.split(/\r?\n/u).filter(Boolean))
      if (stderr.length > this.stderrLineLimit) {
        stderr.splice(0, stderr.length - this.stderrLineLimit)
      }
    })

    const exited = new Promise<TargetExit>(resolveExit => {
      child.once('exit', (code, signal) => {
        resolveExit({ code, signal })
        this.processes.delete(id)
        const count = this.perTargetCounts.get(target.definition.id) ?? 1
        if (count <= 1) this.perTargetCounts.delete(target.definition.id)
        else this.perTargetCounts.set(target.definition.id, count - 1)
      })
    })

    const handle: ManagedTarget = {
      id,
      targetId: target.definition.id,
      pid: child.pid ?? -1,
      cwd: target.cwd,
      child,
      stderr,
      exited,
    }
    this.processes.set(id, handle)
    this.perTargetCounts.set(target.definition.id, targetCount + 1)
    child.once('error', () => this.processes.delete(id))
    return handle
  }

  async stop(handleId: string): Promise<TargetExit> {
    const target = this.get(handleId)
    if (target.child.exitCode !== null || target.child.signalCode !== null) {
      return target.exited
    }

    this.signalTree(target.child, 'SIGTERM')
    const graceful = await Promise.race([
      target.exited.then(exit => ({ exit })),
      new Promise<{ timeout: true }>(resolveTimeout =>
        setTimeout(
          () => resolveTimeout({ timeout: true }),
          this.gracefulShutdownMs
        )
      ),
    ])
    if ('exit' in graceful) return graceful.exit

    this.signalTree(target.child, 'SIGKILL')
    return target.exited
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.processes.keys()].map(id => this.stop(id)))
  }

  private signalTree(
    child: ChildProcessWithoutNullStreams,
    signal: NodeJS.Signals
  ): void {
    if (child.pid === undefined) return
    try {
      if (process.platform === 'win32') child.kill(signal)
      else process.kill(-child.pid, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
}
