import type {
  RedactionEntry,
  RedactionManifest,
  TranscriptDraft,
} from './transcript.js'

const defaultSensitiveKeys = Object.freeze([
  'authorization',
  'cookie',
  'env',
  'environment',
  'api-key',
  'api_key',
  'apikey',
  'password',
  'secret',
  'token',
])

export interface RedactionPolicy {
  readonly replacement?: string
  readonly sensitiveKeys?: readonly string[]
  readonly secretValues?: readonly string[]
  readonly explicitPaths?: readonly string[]
}

export interface RedactionResult<T> {
  readonly value: T
  readonly manifest: RedactionManifest
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replaceAll(/[-_]/gu, '')
}

function matchesPath(path: readonly string[], pattern: string): boolean {
  const parts = pattern.split('.').filter(Boolean)
  return (
    parts.length === path.length &&
    parts.every((part, index) => part === '*' || part === path[index])
  )
}

export function redactTranscriptDraft(
  draft: TranscriptDraft,
  policy: RedactionPolicy = {}
): RedactionResult<TranscriptDraft> {
  const replacement = policy.replacement ?? '[REDACTED]'
  const sensitiveKeys = new Set(
    [...defaultSensitiveKeys, ...(policy.sensitiveKeys ?? [])].map(
      normalizedKey
    )
  )
  const secretValues = [...(policy.secretValues ?? [])]
    .filter(value => value.length > 0)
    .sort((left, right) => right.length - left.length)
  const explicitPaths = policy.explicitPaths ?? []
  const entries: RedactionEntry[] = []

  const record = (
    path: readonly string[],
    reason: RedactionEntry['reason']
  ): void => {
    const dottedPath = path.join('.')
    if (
      !entries.some(
        entry => entry.path === dottedPath && entry.reason === reason
      )
    ) {
      entries.push({ path: dottedPath, reason })
    }
  }

  const redactString = (value: string, path: readonly string[]): string => {
    let result = value
    for (const secret of secretValues) {
      if (!result.includes(secret)) continue
      result = result.replaceAll(secret, replacement)
      record(path, 'secret-value')
    }
    return result
  }

  const visit = (value: unknown, path: readonly string[]): unknown => {
    if (explicitPaths.some(pattern => matchesPath(path, pattern))) {
      record(path, 'explicit-path')
      return replacement
    }
    if (typeof value === 'string') {
      if (path.at(-1) === 'raw') {
        try {
          const parsed = JSON.parse(value) as unknown
          const redacted = visit(parsed, [...path, '$json'])
          return JSON.stringify(redacted)
        } catch {
          return redactString(value, path)
        }
      }
      return redactString(value, path)
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => visit(item, [...path, String(index)]))
    }
    if (typeof value !== 'object' || value === null) return value

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const itemPath = [...path, key]
        if (sensitiveKeys.has(normalizedKey(key))) {
          record(itemPath, 'sensitive-key')
          return [key, replacement]
        }
        return [key, visit(item, itemPath)]
      })
    )
  }

  return {
    value: visit(draft, []) as TranscriptDraft,
    manifest: {
      version: 1,
      replacement,
      entries: entries.sort((left, right) =>
        left.path.localeCompare(right.path)
      ),
    },
  }
}
