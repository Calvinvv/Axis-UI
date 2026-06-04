import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  name: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const publicPackages = [
  ['packages/components', 'axis-ui'],
  ['packages/theme-chalk', '@axis-ui/theme-chalk'],
  ['packages/utils', '@axis-ui/utils'],
] as const

const privateDevKitPackages = [
  ['packages/acp-core', '@axis-ui/acp-core'],
  ['packages/acp-harness', '@axis-ui/acp-harness'],
  ['packages/acp-cli', '@axis-ui/acp-cli'],
  ['apps/acp-devtools', '@axis-ui/acp-devtools'],
  ['fixtures/acp-agents', '@axis-ui/acp-fixture-agents'],
] as const

function readText(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T
}

function readManifest(path: string): PackageManifest {
  return readJson<PackageManifest>(`${path}/package.json`)
}

describe('repository and release boundaries', () => {
  it('uses only the precise workspace roots from the ACP plan', () => {
    const entries = [
      ...readText('pnpm-workspace.yaml').matchAll(/- '([^']+)'/g),
    ]
      .map(match => match[1])
      .sort()

    expect(entries).toEqual(
      ['./apps/**', './fixtures/acp-agents', './packages/**', './play'].map(
        entry => entry.replace(/^\.\//, '')
      )
    )
  })

  it('keeps the three existing public package names unchanged', () => {
    for (const [path, expectedName] of publicPackages) {
      const manifest = readManifest(path)

      expect(manifest.name).toBe(expectedName)
      expect(manifest.private).not.toBe(true)
    }
  })

  it('marks every ACP workspace package as private', () => {
    for (const [path, expectedName] of privateDevKitPackages) {
      const manifest = readManifest(path)

      expect(manifest.name).toBe(expectedName)
      expect(manifest.private).toBe(true)
    }
  })

  it('prevents public packages from depending on private ACP packages', () => {
    for (const [path] of publicPackages) {
      const manifest = readManifest(path)
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      }

      expect(Object.keys(dependencies)).not.toContainEqual(
        expect.stringMatching(/^@axis-ui\/acp-/)
      )
    }
  })

  it('builds all workspaces but publish-checks and releases an allowlist', () => {
    const root = readJson<PackageManifest>('package.json')
    const buildAll = root.scripts?.['build:all'] ?? ''
    const checkPublish = root.scripts?.['check:publish'] ?? ''
    const releasePackages = root.scripts?.['release:packages'] ?? ''

    expect(buildAll).toContain('--filter "./packages/**"')
    expect(buildAll).toContain('--filter "./apps/**"')
    expect(buildAll).toContain('--filter "./fixtures/acp-agents"')

    for (const [, packageName] of publicPackages) {
      expect(checkPublish).toContain(`--filter ${packageName}`)
      expect(releasePackages).toContain(`--filter ${packageName}`)
    }

    expect(checkPublish).not.toContain('--filter "./packages/**"')
    expect(releasePackages).not.toContain('pnpm -r publish')
  })

  it('disables Changesets versioning and tags for private packages', () => {
    const changesets = readJson<{ privatePackages?: boolean }>(
      '.changeset/config.json'
    )

    expect(changesets.privatePackages).toBe(false)
  })
})
