function normalize(value: unknown, seen: WeakSet<object>): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON does not support non-finite numbers')
    }
    return value
  }
  if (value === undefined) return undefined
  if (typeof value !== 'object') {
    throw new TypeError(`Canonical JSON does not support ${typeof value}`)
  }
  if (seen.has(value))
    throw new TypeError('Canonical JSON cannot contain cycles')
  seen.add(value)
  try {
    if (Array.isArray(value)) {
      return value.map(item => normalize(item, seen) ?? null)
    }
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([key, item]) => {
          const normalized = normalize(item, seen)
          return normalized === undefined ? [] : [[key, normalized]]
        })
    )
  } finally {
    seen.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value, new WeakSet()))
}

export async function stateHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
