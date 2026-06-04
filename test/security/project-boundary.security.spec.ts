import { describe, expect, it } from 'vitest'

describe('security test project boundary', () => {
  it('runs independently in Node', () => {
    expect(typeof process.versions.node).toBe('string')
  })
})
