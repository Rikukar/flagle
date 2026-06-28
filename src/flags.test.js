import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { FLAGS, FLAG_W, FLAG_H } from './flags'
import { dims, capX, capY, capU, clampCenter, isUniform } from './geometry'

const HEX = /^#[0-9a-fA-F]{6}$/
const allBlocks = FLAGS.flatMap((f) => f.blocks.map((b) => [f, b]))

describe('flag set', () => {
  it('has a healthy number of flags', () => {
    expect(FLAGS.length).toBeGreaterThanOrEqual(60)
  })

  it('every flag has unique id and code, and at least one block', () => {
    const ids = FLAGS.map((f) => f.id)
    const codes = FLAGS.map((f) => f.code)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(codes).size).toBe(codes.length)
    for (const f of FLAGS) {
      expect(f.name, `${f.code} name`).toBeTruthy()
      expect(f.blocks.length, `${f.code} blocks`).toBeGreaterThan(0)
    }
  })

  it('block ids are unique within each flag', () => {
    for (const f of FLAGS) {
      const ids = f.blocks.map((b) => b.id)
      expect(new Set(ids).size, `${f.code} block ids`).toBe(ids.length)
    }
  })
})

describe('every block is well-formed', () => {
  it('has a valid shape, symmetry, color and numeric target', () => {
    for (const [f, b] of allBlocks) {
      const tag = `${f.code}/${b.id}`
      expect(['rect', 'circle', 'path', 'image'], tag).toContain(b.shape.kind)
      expect([72, 180, 360, 'full'], `${tag} sym`).toContain(b.sym)
      // colored shapes need a valid hex; images carry their own colors
      if (b.shape.kind !== 'image') expect(b.color, `${tag} color`).toMatch(HEX)
      for (const k of ['x', 'y', 'rot']) {
        expect(Number.isFinite(b.target[k]), `${tag} target.${k}`).toBe(true)
      }
      const { w, h } = dims(b)
      expect(w, `${tag} width`).toBeGreaterThan(0)
      expect(h, `${tag} height`).toBeGreaterThan(0)
    }
  })
})

describe('every block fits the flag (the placement/size audit)', () => {
  it('can be placed exactly at its target without being clamped away', () => {
    const bad = []
    for (const [f, b] of allBlocks) {
      const cl = clampCenter(b, b.target.x, b.target.y, b.target.rot, 1, 1)
      if (Math.abs(cl.x - b.target.x) > 0.5 || Math.abs(cl.y - b.target.y) > 0.5) {
        bad.push(`${f.code}/${b.id}: target (${b.target.x},${b.target.y}) unreachable -> (${cl.x.toFixed(1)},${cl.y.toFixed(1)})`)
      }
    }
    expect(bad).toEqual([])
  })

  it('can be sized to exactly correct (scale 1 within the caps)', () => {
    const bad = []
    for (const [f, b] of allBlocks) {
      if (isUniform(b)) {
        if (capU(b) < 1 - 1e-9) bad.push(`${f.code}/${b.id}: uniform cap ${capU(b).toFixed(3)} < 1`)
      } else {
        if (capX(b) < 1 - 1e-9) bad.push(`${f.code}/${b.id}: capX ${capX(b).toFixed(3)} < 1`)
        if (capY(b) < 1 - 1e-9) bad.push(`${f.code}/${b.id}: capY ${capY(b).toFixed(3)} < 1`)
      }
    }
    expect(bad).toEqual([])
  })

  it('no block is larger than the flag in either dimension', () => {
    const bad = []
    for (const [f, b] of allBlocks) {
      const { w, h } = dims(b)
      if (w > FLAG_W + 0.5 || h > FLAG_H + 0.5) bad.push(`${f.code}/${b.id}: ${w}x${h} exceeds ${FLAG_W}x${FLAG_H}`)
    }
    expect(bad).toEqual([])
  })
})

describe('every flag has a real flag-icons reference asset', () => {
  it('the SVG file exists for each code', () => {
    const missing = FLAGS
      .map((f) => f.code)
      .filter((code) => !existsSync(`node_modules/flag-icons/flags/4x3/${code}.svg`))
    expect(missing).toEqual([])
  })
})
