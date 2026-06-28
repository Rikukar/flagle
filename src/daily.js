// Deterministic helpers for the daily round, so the same date yields the same
// flags for everyone. Pure — no DOM — and unit-testable.

export function hashStr(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher–Yates shuffle (using `rng`) then take the first `n`.
export function pickN(arr, n, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// Local YYYY-MM-DD key for a given date (defaults to today).
export const dailyKeyFor = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// The deterministic daily selection: same `dateKey` -> same flags.
export const dailyPick = (list, n, dateKey) => pickN(list, n, mulberry32(hashStr('flagle-' + dateKey)))
