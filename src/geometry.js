// Pure geometry & scoring helpers for the flag puzzle. No React / DOM here, so
// these are unit-testable in isolation.
import { FLAG_W, FLAG_H } from './flags'

// Resize limits (scale multipliers).
export const MIN_S = 0.3
export const MAX_S = 2.2

// Per-piece scoring weights / tolerances (fallback per-piece scoring).
export const MAX_DIST = 320 // a piece this far (units) from its target earns 0 position credit
export const SIZE_TOL = 0.6 // a scale off by this much earns 0 size credit
export const W_POS = 0.5
export const W_ROT = 0.2
export const W_SIZE = 0.3

export const clampBetween = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Symbols (circle/emblem) scale uniformly so they never distort; rects are free.
export const isUniform = (b) => b.shape.kind !== 'rect'

// Natural (unscaled, scale=1 = correct) bounding size of a block.
export function dims(b) {
  const s = b.shape
  if (s.kind === 'circle') return { w: 2 * s.r, h: 2 * s.r }
  return { w: s.w, h: s.h } // rect, image, path (real bbox, not a square)
}

// A piece may never grow larger than the flag itself (unrotated baseline).
export const capX = (b) => Math.min(MAX_S, FLAG_W / dims(b).w)
export const capY = (b) => Math.min(MAX_S, FLAG_H / dims(b).h)
export const capU = (b) => { const n = dims(b); return Math.min(MAX_S, FLAG_W / n.w, FLAG_H / n.h) }

// --- rotation-aware size limits: the ROTATED bbox must fit inside the flag ---
export const trig = (rot) => { const r = (rot * Math.PI) / 180; return { c: Math.abs(Math.cos(r)), s: Math.abs(Math.sin(r)) } }

// shrink factor (<=1) that makes the rotated bbox fit at the given scales
export function fitFactor(b, rot, sx, sy) {
  const { w, h } = dims(b)
  const { c, s } = trig(rot)
  const exW = w * sx * c + h * sy * s
  const exH = w * sx * s + h * sy * c
  return Math.min(1, FLAG_W / exW, FLAG_H / exH)
}

// largest sx (resp. sy) keeping the rotated bbox inside the flag, other axis fixed
export function maxSx(b, rot, sy) {
  const { w, h } = dims(b)
  const { c, s } = trig(rot)
  let m = MAX_S
  if (w * c > 1e-6) m = Math.min(m, (FLAG_W - h * sy * s) / (w * c))
  if (w * s > 1e-6) m = Math.min(m, (FLAG_H - h * sy * c) / (w * s))
  return Math.max(MIN_S, m)
}
export function maxSy(b, rot, sx) {
  const { w, h } = dims(b)
  const { c, s } = trig(rot)
  let m = MAX_S
  if (h * c > 1e-6) m = Math.min(m, (FLAG_H - w * sx * s) / (h * c))
  if (h * s > 1e-6) m = Math.min(m, (FLAG_W - w * sx * c) / (h * s))
  return Math.max(MIN_S, m)
}

// Keep a block's rotated, scaled bounding box inside the flag frame by clamping its center.
export function clampCenter(b, x, y, rot, sx, sy) {
  const nat = dims(b)
  const w = nat.w * sx
  const h = nat.h * sy
  const { c, s } = trig(rot)
  const halfW = (w / 2) * c + (h / 2) * s
  const halfH = (w / 2) * s + (h / 2) * c
  const fit = (v, lo, hi, mid) => (lo > hi ? mid : Math.min(hi, Math.max(lo, v)))
  return {
    x: fit(x, halfW, FLAG_W - halfW, FLAG_W / 2),
    y: fit(y, halfH, FLAG_H - halfH, FLAG_H / 2),
  }
}

// Smallest absolute angle difference (degrees) given a rotational symmetry period.
export function angleDiff(a, b, period) {
  if (period === 'full') return 0
  let d = (((a - b) % period) + period) % period
  if (d > period / 2) d = period - d
  return Math.abs(d)
}

export const sizeAcc = (s) => Math.max(0, 1 - Math.abs(s - 1) / SIZE_TOL)

// Accuracy in [0,1] of a piece (loc) measured against a given target.
export function accFor(block, loc, target) {
  if (!loc || loc.zone !== 'board') return 0
  const dist = Math.hypot(loc.x - target.x, loc.y - target.y)
  const accPos = Math.max(0, 1 - dist / MAX_DIST)
  let accRot = 1
  if (block.sym !== 'full') {
    accRot = Math.max(0, 1 - angleDiff(loc.rot, target.rot, block.sym) / (block.sym / 2))
  }
  const accSize = isUniform(block) ? sizeAcc(loc.sx) : (sizeAcc(loc.sx) + sizeAcc(loc.sy)) / 2
  return W_POS * accPos + W_ROT * accRot + W_SIZE * accSize
}

// Visual signature — pieces that share one are interchangeable (e.g. Nigeria's two
// green stripes, Canada's two red bars), so it shouldn't matter which goes where.
export function signature(b) {
  const s = b.shape
  if (s.kind === 'rect') return `rect:${s.w}:${s.h}:${b.color}:${b.sym}`
  if (s.kind === 'circle') return `circle:${s.r}:${b.color}:${b.sym}`
  if (s.kind === 'path') return `path:${b.color}:${b.sym}:${s.d}`
  return `image:${s.href}:${s.w}:${s.h}:${b.sym}`
}

// Best total accuracy when assigning a group of identical pieces to their targets.
export function bestGroupAccuracy(sample, pieceLocs, targets) {
  const n = pieceLocs.length
  if (n === 1) return accFor(sample, pieceLocs[0], targets[0])
  let best = -Infinity
  const idx = [...Array(n).keys()]
  const permute = (k) => {
    if (k === n) {
      let sum = 0
      for (let i = 0; i < n; i++) sum += accFor(sample, pieceLocs[i], targets[idx[i]])
      if (sum > best) best = sum
      return
    }
    for (let i = k; i < n; i++) {
      ;[idx[k], idx[i]] = [idx[i], idx[k]]
      permute(k + 1)
      ;[idx[k], idx[i]] = [idx[i], idx[k]]
    }
  }
  if (n <= 8) {
    permute(0)
    return best
  }
  // greedy fallback for improbably large groups
  const used = new Array(n).fill(false)
  let sum = 0
  for (let i = 0; i < n; i++) {
    let bj = -1
    let bv = -Infinity
    for (let j = 0; j < n; j++) {
      if (used[j]) continue
      const v = accFor(sample, pieceLocs[i], targets[j])
      if (v > bv) { bv = v; bj = j }
    }
    used[bj] = true
    sum += bv
  }
  return sum
}
