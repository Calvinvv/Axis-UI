import { describe, expect, it } from 'vitest'

describe('replay test project boundary', () => {
  it('runs independently in Node', () => {
    expect(typeof process.versions.node).toBe('string')
  })
})
