import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runCli } from '../../packages/acp-cli/src/cli.js'
import { parseTranscript } from '../../packages/acp-core/src/transcript.js'
import { repositoryRoot } from '../helpers/acp-fixture.js'

describe('Headless CLI and single-run report', () => {
  it('runs a fixed scenario and writes replayable JSON plus escaped HTML', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'axis-acp-cli-'))
    const stdout: string[] = []
    const stderr: string[] = []

    const exitCode = await runCli(
      [
        'run',
        '--target',
        'fixture-agent',
        '--scenario',
        'capability-method-mismatch',
        '--workspace',
        repositoryRoot,
        '--output',
        outputDirectory,
      ],
      {
        stdout: message => stdout.push(message),
        stderr: message => stderr.push(message),
      }
    )

    expect(exitCode).toBe(0)
    expect(stderr).toEqual([])
    const summary = JSON.parse(stdout[0] ?? '{}') as {
      transcriptPath: string
      reportPath: string
    }
    const transcript = parseTranscript(
      await readFile(summary.transcriptPath, 'utf8')
    )
    const html = await readFile(summary.reportPath, 'utf8')

    expect(transcript.run.scenarioId).toBe('capability-method-mismatch')
    expect(transcript.diagnostics).toContainEqual(
      expect.objectContaining({
        kind: 'capability-contract-mismatch',
        subject: 'agent',
      })
    )
    expect(html).toContain('not official ACP certification')
    expect(html).toContain('omitted-capability-is-unsupported')

    const replayOutput: string[] = []
    expect(
      await runCli(['replay', '--input', summary.transcriptPath], {
        stdout: message => replayOutput.push(message),
        stderr: () => undefined,
      })
    ).toBe(0)
    expect(JSON.parse(replayOutput[0] ?? '{}')).toMatchObject({
      status: 'completed',
      integrityValid: true,
    })
  })
})
