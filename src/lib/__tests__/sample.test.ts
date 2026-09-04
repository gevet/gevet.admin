import { describe, it, expect } from 'vitest'

describe('sample test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    const msg = 'hello'
    expect(msg).toContain('ello')
  })
})
