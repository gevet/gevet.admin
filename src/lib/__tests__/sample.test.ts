describe('Basic Arithmetic', () => {
  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const msg = 'hello'
    expect(msg).toContain('ello')
  })

  it('should verify string length', () => {
    const text = 'testing'
    expect(text).toHaveLength(7)
  })
})
