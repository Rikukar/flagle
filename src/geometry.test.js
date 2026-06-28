import { describe, it, expect } from 'vitest'
import { FLAG_W, FLAG_H } from './flags'
import {
  MIN_S, MAX_S, clampBetween, isUniform, dims, capX, capY, capU,
  fitFactor, maxSx, maxSy, clampCenter, angleDiff, sizeAcc, accFor,
  signature, bestGroupAccuracy,
} from './geometry'

const rect = (w, h, extra = {}) => ({ shape: { kind: 'rect', w, h }, color: '#fff', sym: 180, ...extra })
const circle = (r) => ({ shape: { kind: 'circle', r }, color: '#fff', sym: 'full' })

describe('clampBetween', () => {
  it('clamps within bounds', () => {
    expect(clampBetween(5, 0, 10)).toBe(5)
    expect(clampBetween(-1, 0, 10)).toBe(0)
    expect(clampBetween(99, 0, 10)).toBe(10)
  })
})

describe('isUniform / dims', () => {
  it('rects are non-uniform, others uniform', () => {
    expect(isUniform(rect(10, 20))).toBe(false)
    expect(isUniform(circle(5))).toBe(true)
    expect(isUniform({ shape: { kind: 'image', w: 1, h: 1 } })).toBe(true)
  })
  it('dims returns bbox; circle is diameter-square', () => {
    expect(dims(rect(30, 40))).toEqual({ w: 30, h: 40 })
    expect(dims(circle(7))).toEqual({ w: 14, h: 14 })
  })
})

describe('size caps never block reaching scale 1', () => {
  // a piece sized exactly to the flag has cap 1; nothing should be below 1
  it('full-flag rect caps at exactly 1', () => {
    const b = rect(FLAG_W, FLAG_H)
    expect(capX(b)).toBeCloseTo(1, 9)
    expect(capY(b)).toBeCloseTo(1, 9)
    expect(capU(b)).toBeCloseTo(1, 9)
  })
  it('small piece caps at MAX_S', () => {
    expect(capX(rect(10, 10))).toBe(MAX_S)
    expect(capU(circle(5))).toBe(MAX_S)
  })
})

describe('rotation-aware fit', () => {
  it('a horizontal stripe turned vertical is shrunk to fit the flag height', () => {
    const b = rect(FLAG_W, 96) // 640x96
    // unrotated it fits at scale 1
    expect(fitFactor(b, 0, 1, 1)).toBeCloseTo(1, 6)
    // rotated 90deg its width (640) becomes vertical extent > flag height (480)
    expect(fitFactor(b, 90, 1, 1)).toBeCloseTo(FLAG_H / FLAG_W, 4)
  })
  it('maxSx at 90deg keeps the rotated bbox within the flag height', () => {
    const b = rect(FLAG_W, 96)
    const sx = maxSx(b, 90, 1)
    // rotated width extent = w * sx must be <= FLAG_H
    expect(b.shape.w * sx).toBeLessThanOrEqual(FLAG_H + 1e-6)
  })
  it('maxSy respects the flag too', () => {
    const b = rect(96, FLAG_H)
    const sy = maxSy(b, 90, 1)
    expect(b.shape.h * sy).toBeLessThanOrEqual(FLAG_W + 1e-6)
  })
})

describe('clampCenter keeps the (rotated, scaled) bbox inside the flag', () => {
  it('clamps a piece dragged off the top-left corner', () => {
    const b = rect(200, 100)
    const { x, y } = clampCenter(b, -9999, -9999, 0, 1, 1)
    expect(x).toBeCloseTo(100, 6) // half width
    expect(y).toBeCloseTo(50, 6) // half height
  })
  it('clamps to the right/bottom edges', () => {
    const b = rect(200, 100)
    const { x, y } = clampCenter(b, 9999, 9999, 0, 1, 1)
    expect(x).toBeCloseTo(FLAG_W - 100, 6)
    expect(y).toBeCloseTo(FLAG_H - 50, 6)
  })
  it('rotation changes the effective extent used for clamping', () => {
    const b = rect(200, 100)
    const { x } = clampCenter(b, -9999, 240, 90, 1, 1)
    expect(x).toBeCloseTo(50, 6) // at 90deg the 100-tall dimension is now horizontal -> half = 50
  })
  it('an oversized piece is centered (cannot fit)', () => {
    const b = rect(FLAG_W * 2, FLAG_H)
    const { x } = clampCenter(b, 0, 240, 0, 1, 1)
    expect(x).toBeCloseTo(FLAG_W / 2, 6)
  })
})

describe('angleDiff (symmetry-aware)', () => {
  it('full symmetry always matches', () => {
    expect(angleDiff(123, 0, 'full')).toBe(0)
  })
  it('180 symmetry: upside-down == upright', () => {
    expect(angleDiff(180, 0, 180)).toBe(0)
    expect(angleDiff(10, 0, 180)).toBe(10)
    expect(angleDiff(170, 0, 180)).toBe(10)
  })
  it('72 symmetry (5-point star): every fifth turn matches', () => {
    expect(angleDiff(72, 0, 72)).toBe(0)
    expect(angleDiff(36, 0, 72)).toBe(36)
  })
})

describe('per-piece scoring', () => {
  it('a tray piece scores 0', () => {
    expect(accFor(rect(10, 10), { zone: 'tray' }, { x: 0, y: 0, rot: 0 })).toBe(0)
  })
  it('perfect placement scores 1', () => {
    const b = rect(100, 50)
    const loc = { zone: 'board', x: 50, y: 50, rot: 0, sx: 1, sy: 1 }
    expect(accFor(b, loc, { x: 50, y: 50, rot: 0 })).toBeCloseTo(1, 6)
  })
  it('sizeAcc peaks at scale 1 and falls off', () => {
    expect(sizeAcc(1)).toBe(1)
    expect(sizeAcc(0.4)).toBeCloseTo(0, 6)
    expect(sizeAcc(1.6)).toBeCloseTo(0, 6)
  })
})

describe('interchangeable-piece scoring (swap invariance)', () => {
  const green = () => ({ shape: { kind: 'rect', w: 213, h: 480 }, color: '#008753', sym: 180 })
  it('identical pieces share a signature; distinct colors do not', () => {
    expect(signature(green())).toBe(signature(green()))
    const red = { shape: { kind: 'rect', w: 213, h: 480 }, color: '#ff0000', sym: 180 }
    expect(signature(green())).not.toBe(signature(red))
  })
  it('best assignment is invariant to which identical piece goes where', () => {
    const b = green()
    const targets = [{ x: 106, y: 240, rot: 0 }, { x: 534, y: 240, rot: 0 }]
    const perfect = [
      { zone: 'board', x: 106, y: 240, rot: 0, sx: 1, sy: 1 },
      { zone: 'board', x: 534, y: 240, rot: 0, sx: 1, sy: 1 },
    ]
    const swapped = [perfect[1], perfect[0]]
    const a = bestGroupAccuracy(b, perfect, targets)
    const c = bestGroupAccuracy(b, swapped, targets)
    expect(a).toBeCloseTo(c, 9)
    expect(a).toBeCloseTo(2, 6) // both perfect -> 2 pieces * 1.0
  })
})
