import { describe, expect, it } from 'vitest'

describe('scenario test project boundary', () => {
  it('runs independently in Node', () => {
    expect(typeof process.versions.node).toBe('string')
  })
})
