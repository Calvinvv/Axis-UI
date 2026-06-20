import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseTranscript,
  serializeTranscript,
  TranscriptReplay,
} from '@axis-ui/acp-core'
import {
  AcpHarness,
  coreScenarios,
  createOpenCodeTarget,
  findExecutable,
  ScenarioRunner,
  TargetRegistry,
  type CoreScenarioId,
  type TargetDefinition,
} from '@axis-ui/acp-harness'
import { renderScenarioReport } from './report.js'

export interface CliIo {
  readonly stdout: (message: string) => void
  readonly stderr: (message: string) => void
}

const defaultIo: CliIo = {
  stdout: message => console.log(message),
  stderr: message => console.error(message),
}

interface ParsedArguments {
  readonly command?: string
  readonly options: Readonly<Record<string, string>>
}

export async function runCli(
  argv: readonly string[],
  io: CliIo = defaultIo
): Promise<number> {
  try {
    const parsed = parseArguments(argv)
    if (parsed.command === undefined || parsed.command === 'help') {
      io.stdout(helpText)
      return 0
    }
    if (parsed.command === 'run') return await runScenario(parsed.options, io)
    if (parsed.command === 'inspect') {
      return await inspectTarget(parsed.options, io)
    }
    if (parsed.command === 'replay') {
      return await replayArtifact(parsed.options, io)
    }
    throw new Error(`Unknown command: ${parsed.command}`)
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error))
    return 1
  }
}

async function runScenario(
  options: Readonly<Record<string, string>>,
  io: CliIo
): Promise<number> {
  const workspaceRoot = resolve(options.workspace ?? process.cwd())
  const scenarioId = (options.scenario ??
    'normal-prompt-turn') as CoreScenarioId
  const definition = coreScenarios[scenarioId]
  if (definition === undefined)
    throw new Error(`Unknown scenario: ${scenarioId}`)
  const targetId = options.target ?? 'fixture-agent'
  const registry = await createRegistry(targetId, workspaceRoot)
  const timeoutMs = parsePositiveInteger(
    options.timeout,
    targetId === 'opencode' ? 120_000 : 2_000
  )
  const runner = new ScenarioRunner({
    registry,
    targetId,
    workspaceRoot,
    timeoutMs,
  })
  const report = await runner.run(definition)
  const outputDirectory = resolve(options.output ?? 'artifacts/runs')
  const stem = `${targetId}-${scenarioId}`
  const transcriptPath = resolve(
    options.json ?? resolve(outputDirectory, `${stem}.axis-acp.json`)
  )
  const reportPath = resolve(
    options.html ?? resolve(outputDirectory, `${stem}.html`)
  )
  await Promise.all([
    writeText(transcriptPath, serializeTranscript(report.transcript)),
    writeText(
      reportPath,
      renderScenarioReport(report, basename(transcriptPath))
    ),
  ])
  io.stdout(
    JSON.stringify(
      {
        status: report.status,
        targetId,
        scenarioId,
        diagnostics: report.diagnostics.length,
        traceCount: report.traceCount,
        eventCount: report.eventCount,
        transcriptPath,
        reportPath,
      },
      null,
      2
    )
  )
  return report.status === 'passed' ? 0 : 1
}

async function inspectTarget(
  options: Readonly<Record<string, string>>,
  io: CliIo
): Promise<number> {
  const workspaceRoot = resolve(options.workspace ?? process.cwd())
  const targetId = options.target ?? 'opencode'
  const registry = await createRegistry(targetId, workspaceRoot)
  const harness = new AcpHarness(registry)
  let targetHandleId: string | undefined
  try {
    const target = await harness.startTarget({ targetId, workspaceRoot })
    targetHandleId = target.id
    const initialization = await harness.initialize(target.id)
    const capability = harness.events.find(
      event => event.type === 'capability/snapshot'
    )
    await harness.stopTarget(target.id)
    targetHandleId = undefined
    io.stdout(
      JSON.stringify(
        {
          targetId,
          protocolVersion: initialization.response.protocolVersion,
          agentInfo: capability?.agentInfo,
          agentCapabilities: capability?.agentCapabilities,
          traceCount: harness.trace.length,
          eventCount: harness.events.length,
          activeProcesses: harness.processes.list().length,
        },
        null,
        2
      )
    )
    return 0
  } finally {
    if (targetHandleId !== undefined) {
      await harness.stopTarget(targetHandleId).catch(() => undefined)
    }
    await harness.dispose()
  }
}

async function replayArtifact(
  options: Readonly<Record<string, string>>,
  io: CliIo
): Promise<number> {
  const input = options.input
  if (input === undefined) throw new Error('replay requires --input <file>')
  const transcript = parseTranscript(await readFile(resolve(input), 'utf8'))
  const replay = new TranscriptReplay(transcript)
  const snapshot = replay.playToEnd()
  const valid = await replay.verifyIntegrity()
  io.stdout(
    JSON.stringify(
      {
        runId: transcript.run.id,
        scenarioId: transcript.run.scenarioId,
        status: snapshot.status,
        sequence: snapshot.currentSequence,
        stateHashes: await replay.stateHashes(),
        integrityValid: valid,
      },
      null,
      2
    )
  )
  return valid ? 0 : 1
}

async function createRegistry(
  targetId: string,
  workspaceRoot: string
): Promise<TargetRegistry> {
  const definition = targetDefinition(targetId)
  return TargetRegistry.create([definition], [workspaceRoot])
}

function targetDefinition(targetId: string): TargetDefinition {
  if (targetId === 'fixture-agent') {
    return {
      id: targetId,
      command: process.execPath,
      fixedArgs: [
        fileURLToPath(
          new URL(
            '../../../fixtures/acp-agents/bin/fixture-agent.mjs',
            import.meta.url
          )
        ),
      ],
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
  }
  if (targetId === 'opencode') {
    const command = process.env.AXIS_OPENCODE_PATH ?? findExecutable('opencode')
    if (command === undefined) {
      throw new Error(
        'OpenCode was not found; set AXIS_OPENCODE_PATH to an absolute executable path'
      )
    }
    return createOpenCodeTarget(command)
  }
  throw new Error(`Unknown target: ${targetId}`)
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${content}\n`, 'utf8')
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`)
  }
  return parsed
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  const [command, ...rest] = argv
  const options: Record<string, string> = {}
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]
    const value = rest[index + 1]
    if (key === undefined || !key.startsWith('--') || value === undefined) {
      throw new Error(`Invalid option near: ${key ?? '(end)'}`)
    }
    options[key.slice(2)] = value
  }
  return { command, options }
}

const helpText = `Axis ACP DevKit

Usage:
  axis-acp run --target fixture-agent --scenario normal-prompt-turn --workspace .
  axis-acp inspect --target opencode --workspace .
  axis-acp replay --input artifacts/runs/fixture-agent-normal-prompt-turn.axis-acp.json

Commands:
  run      Execute one of the three fixed scenarios and write JSON + HTML.
  inspect  Initialize a registered target and print capabilities without a model turn.
  replay   Restore recorded semantic events and verify final state hashes.`
