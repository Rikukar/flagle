import { describe, it, expect } from 'vitest'
import { hashStr, mulberry32, pickN, dailyKeyFor, dailyPick } from './daily'

describe('hashStr', () => {
  it('is deterministic and unsigned', () => {
    expect(hashStr('flagle-2026-06-17')).toBe(hashStr('flagle-2026-06-17'))
    expect(hashStr('a')).not.toBe(hashStr('b'))
    expect(hashStr('anything')).toBeGreaterThanOrEqual(0)
  })
})

describe('mulberry32', () => {
  it('same seed -> same sequence; different seed -> different', () => {
    const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43)
    const seq = (r) => [r(), r(), r()]
    expect(seq(a)).toEqual(seq(b))
    expect(seq(mulberry32(42))).not.toEqual(seq(c))
  })
  it('produces values in [0,1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('pickN', () => {
  it('returns exactly n items, all from the source', () => {
    const list = Array.from({ length: 20 }, (_, i) => i)
    const out = pickN(list, 5, mulberry32(1))
    expect(out).toHaveLength(5)
    expect(new Set(out).size).toBe(5) // no duplicates
    out.forEach((x) => expect(list).toContain(x))
  })
  it('does not mutate the source array', () => {
    const list = [1, 2, 3, 4, 5]
    const copy = [...list]
    pickN(list, 3, mulberry32(2))
    expect(list).toEqual(copy)
  })
})

describe('dailyKeyFor', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(dailyKeyFor(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dailyKeyFor(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('dailyPick (the daily round)', () => {
  const list = Array.from({ length: 70 }, (_, i) => `flag${i}`)
  it('is identical for the same date key (same for everyone)', () => {
    expect(dailyPick(list, 5, '2026-06-17')).toEqual(dailyPick(list, 5, '2026-06-17'))
  })
  it('differs across dates', () => {
    expect(dailyPick(list, 5, '2026-06-17')).not.toEqual(dailyPick(list, 5, '2026-06-18'))
  })
  it('returns n distinct flags', () => {
    const out = dailyPick(list, 5, '2026-06-17')
    expect(out).toHaveLength(5)
    expect(new Set(out).size).toBe(5)
  })
})
