import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FLAG_W, FLAG_H } from './flags'
import { flagUrl } from './flagAssets'

const SNAP_ROT_TOL = 12 // snap to nearest 90deg (level) on release — a usability aid only

// Scoring weights / tolerances.
const MAX_DIST = 320 // a piece this far (units) from its target earns 0 position credit
const SIZE_TOL = 0.6 // a scale off by this much (e.g. 1.6x or 0.4x) earns 0 size credit
const W_POS = 0.5
const W_ROT = 0.2
const W_SIZE = 0.3

// Resize limits and random starting range.
const MIN_S = 0.3
const MAX_S = 2.2
const EDGE = 22 // grab band (units) near a piece edge/corner that starts a resize
const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const randScale = () => rand(0.3, 0.6) // start small so pieces don't fill the flag
const randRot = () => Math.random() * 360
const clampBetween = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// --- tray geometry (below the flag frame) ---
const TRAY_Y0 = 540
const TRAY_Y1 = 720
const TRAY_PAD = 18
const TRAY_LEFT = 8
const TRAY_RIGHT = FLAG_W - 8
const TRAY_GAP = 18
const TRAY_INNER_H = TRAY_Y1 - TRAY_Y0 - 2 * TRAY_PAD
const TRAY_WIDTH = TRAY_RIGHT - TRAY_LEFT
const TRAY_MAX_SCALE = 0.5

const VB_W = FLAG_W + 40
const VB_H = TRAY_Y1 + 20

// Symbols (circle/emblem) scale uniformly so they never distort; rects are free.
const isUniform = (b) => b.shape.kind !== 'rect'

// Natural (unscaled, scale=1 = correct) bounding size.
function dims(b) {
  const s = b.shape
  if (s.kind === 'rect') return { w: s.w, h: s.h }
  if (s.kind === 'circle') return { w: 2 * s.r, h: 2 * s.r }
  if (s.kind === 'image') return { w: s.w, h: s.h }
  return { w: 2 * s.half, h: 2 * s.half } // path
}

// A piece may never grow larger than the flag itself.
const capX = (b) => Math.min(MAX_S, FLAG_W / dims(b).w)
const capY = (b) => Math.min(MAX_S, FLAG_H / dims(b).h)
const capU = (b) => { const n = dims(b); return Math.min(MAX_S, FLAG_W / n.w, FLAG_H / n.h) }

// Which cursor for a pointer at local offset (lx,ly) over a piece.
// interior -> move; side -> axis arrows (rotation-aware); corner/symbol -> move.
function cursorFor(block, lx, ly, u, v, hw0, hh0) {
  const edgeX = Math.min(EDGE, hw0 * 0.45)
  const edgeY = Math.min(EDGE, hh0 * 0.45)
  const nearX = Math.abs(Math.abs(lx) - hw0) <= edgeX && Math.abs(ly) <= hh0 + edgeY
  const nearY = Math.abs(Math.abs(ly) - hh0) <= edgeY && Math.abs(lx) <= hw0 + edgeX
  if (!(nearX || nearY)) return 'grab' // interior -> move by dragging
  if (isUniform(block) || (nearX && nearY)) return 'move' // corner / symbol -> 4-way arrows
  const dir = nearX ? u : v // resize direction on screen
  return Math.abs(dir.x) >= Math.abs(dir.y) ? 'ew-resize' : 'ns-resize'
}

// --- placement bounds: pieces on the flag may not cross the flag borders ---
const VB_MINX = 0
const VB_MAXX = FLAG_W
const VB_MINY = 0
const VB_MAXY = FLAG_H

// Keep a block's rotated, scaled bounding box inside the flag frame by clamping its center.
function clampCenter(b, x, y, rot, sx, sy) {
  const nat = dims(b)
  const w = nat.w * sx
  const h = nat.h * sy
  const r = (rot * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  const halfW = (w / 2) * c + (h / 2) * s
  const halfH = (w / 2) * s + (h / 2) * c
  const fit = (v, lo, hi, mid) => (lo > hi ? mid : Math.min(hi, Math.max(lo, v)))
  return {
    x: fit(x, VB_MINX + halfW, VB_MAXX - halfW, (VB_MINX + VB_MAXX) / 2),
    y: fit(y, VB_MINY + halfH, VB_MAXY - halfH, (VB_MINY + VB_MAXY) / 2),
  }
}

function angleDiff(a, b, period) {
  if (period === 'full') return 0
  let d = (((a - b) % period) + period) % period
  if (d > period / 2) d = period - d
  return Math.abs(d)
}

const sizeAcc = (s) => Math.max(0, 1 - Math.abs(s - 1) / SIZE_TOL)

// Accuracy in [0,1] of a piece (loc) measured against a given target.
function accFor(block, loc, target) {
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
function signature(b) {
  const s = b.shape
  if (s.kind === 'rect') return `rect:${s.w}:${s.h}:${b.color}:${b.sym}`
  if (s.kind === 'circle') return `circle:${s.r}:${b.color}:${b.sym}`
  if (s.kind === 'path') return `path:${b.color}:${b.sym}:${s.d}`
  return `image:${s.href}:${s.w}:${s.h}:${b.sym}`
}

// Best total accuracy when assigning a group of identical pieces to their targets.
function bestGroupAccuracy(sample, pieceLocs, targets) {
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

function Shape({ b, stroke, strokeW }) {
  const s = b.shape
  const ve = 'non-scaling-stroke'
  if (s.kind === 'rect') return <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill={b.color} stroke={stroke} strokeWidth={strokeW} vectorEffect={ve} />
  if (s.kind === 'circle') {
    return (
      <>
        <rect x={-s.r} y={-s.r} width={2 * s.r} height={2 * s.r} fill="transparent" />
        <circle r={s.r} fill={b.color} stroke={stroke} strokeWidth={strokeW} vectorEffect={ve} />
      </>
    )
  }
  if (s.kind === 'path') {
    return (
      <>
        <rect x={-s.half} y={-s.half} width={2 * s.half} height={2 * s.half} fill="transparent" />
        <path d={s.d} transform={`translate(${-s.cx} ${-s.cy})`} fill={b.color} stroke={stroke === 'none' ? undefined : stroke} strokeWidth={stroke === 'none' ? 0 : strokeW} vectorEffect={ve} />
      </>
    )
  }
  return (
    <>
      <image href={s.href} x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} />
      {stroke !== 'none' && <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill="none" stroke={stroke} strokeWidth={strokeW} strokeDasharray="6 4" vectorEffect={ve} />}
    </>
  )
}

export default function FlagGame({ flag, roundLabel, isLast, onNext, onSkip }) {
  const svgRef = useRef(null)
  const [locs, setLocs] = useState({}) // id -> {zone, x, y, rot, sx, sy}
  const [trayOrder, setTrayOrder] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(null)
  const drag = useRef(null) // { id, mode:'move'|'rotate'|'resize', offX, offY, axis }

  const reset = useCallback(() => {
    const ids = flag.blocks.map((b) => b.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const next = {}
    flag.blocks.forEach((b) => {
      const rot = randRot()
      if (isUniform(b)) {
        const s = clampBetween(randScale(), MIN_S, capU(b))
        next[b.id] = { zone: 'tray', x: 0, y: 0, rot, sx: s, sy: s }
      } else {
        const sx = clampBetween(randScale(), MIN_S, capX(b))
        const sy = clampBetween(randScale(), MIN_S, capY(b))
        next[b.id] = { zone: 'tray', x: 0, y: 0, rot, sx, sy }
      }
    })
    setLocs(next)
    setTrayOrder(ids)
    setSelected(null)
    setScore(null)
  }, [flag])

  useEffect(() => { reset() }, [reset])

  // Preload the real flag image while the player works, so the score screen is instant.
  useEffect(() => {
    const url = flagUrl(flag.code)
    if (url) { const img = new Image(); img.src = url }
  }, [flag.code])

  const trayLayout = useMemo(() => {
    const items = trayOrder.map((id) => {
      const b = flag.blocks.find((x) => x.id === id)
      const d = dims(b)
      const r = ((locs[id]?.rot || 0) * Math.PI) / 180
      const c = Math.abs(Math.cos(r))
      const s = Math.abs(Math.sin(r))
      const rw = d.w * c + d.h * s // rotated bounding box
      const rh = d.w * s + d.h * c
      return { id, rw, scale: Math.min(TRAY_MAX_SCALE, TRAY_INNER_H / rh) }
    })
    let total = items.reduce((sum, it) => sum + it.rw * it.scale, 0) + TRAY_GAP * Math.max(0, items.length - 1)
    const shrink = total > TRAY_WIDTH ? TRAY_WIDTH / total : 1
    items.forEach((it) => { it.scale *= shrink })
    total *= shrink
    const cy = (TRAY_Y0 + TRAY_Y1) / 2
    let x = TRAY_LEFT + Math.max(0, (TRAY_WIDTH - total) / 2)
    const map = {}
    items.forEach((it) => {
      const w = it.rw * it.scale
      map[it.id] = { x: x + w / 2, y: cy, scale: it.scale }
      x += w + TRAY_GAP
    })
    return map
  }, [trayOrder, flag, locs])

  const toSvg = useCallback((e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }, [])

  const locked = score !== null

  // Grabbing near an edge resizes one dimension; near a corner resizes evenly;
  // the interior moves. Symbols always resize evenly. No on-piece buttons.
  const grabBoard = (e, id) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    const p = toSvg(e)
    const loc = locs[id]
    const block = flag.blocks.find((b) => b.id === id)
    const nat = dims(block)
    const r = (loc.rot * Math.PI) / 180
    const u = { x: Math.cos(r), y: Math.sin(r) }
    const v = { x: -Math.sin(r), y: Math.cos(r) }
    const hw0 = (nat.w / 2) * loc.sx
    const hh0 = (nat.h / 2) * loc.sy
    const lx = (p.x - loc.x) * u.x + (p.y - loc.y) * u.y // local x offset
    const ly = (p.x - loc.x) * v.x + (p.y - loc.y) * v.y // local y offset
    document.body.style.cursor = cursorFor(block, lx, ly, u, v, hw0, hh0) // hold cursor during drag
    const edgeX = Math.min(EDGE, hw0 * 0.45)
    const edgeY = Math.min(EDGE, hh0 * 0.45)
    const nearX = Math.abs(Math.abs(lx) - hw0) <= edgeX && Math.abs(ly) <= hh0 + edgeY
    const nearY = Math.abs(Math.abs(ly) - hh0) <= edgeY && Math.abs(lx) <= hw0 + edgeX

    if (nearX || nearY) {
      const signX = lx >= 0 ? 1 : -1
      const signY = ly >= 0 ? 1 : -1
      const axis = (isUniform(block) || (nearX && nearY)) ? 'uniform' : (nearX ? 'x' : 'y')
      let ax = loc.x
      let ay = loc.y
      if (axis === 'x' || axis === 'uniform') { ax -= u.x * signX * hw0; ay -= u.y * signX * hw0 }
      if (axis === 'y' || axis === 'uniform') { ax -= v.x * signY * hh0; ay -= v.y * signY * hh0 }
      drag.current = { id, mode: 'resize', axis, u, v, hw0, hh0, sx0: loc.sx, sy0: loc.sy, signX, signY, anchor: { x: ax, y: ay } }
      return
    }
    drag.current = { id, mode: 'move', offX: p.x - loc.x, offY: p.y - loc.y }
  }

  // Update the cursor as the pointer hovers a piece (no drag in progress).
  const hoverPiece = (e, block) => {
    if (locked || drag.current) return
    const loc = locs[block.id]
    if (!loc) return
    const r = (loc.rot * Math.PI) / 180
    const u = { x: Math.cos(r), y: Math.sin(r) }
    const v = { x: -Math.sin(r), y: Math.cos(r) }
    const hw0 = (dims(block).w / 2) * loc.sx
    const hh0 = (dims(block).h / 2) * loc.sy
    const p = toSvg(e)
    const lx = (p.x - loc.x) * u.x + (p.y - loc.y) * u.y
    const ly = (p.x - loc.x) * v.x + (p.y - loc.y) * v.y
    e.currentTarget.style.cursor = cursorFor(block, lx, ly, u, v, hw0, hh0)
  }

  const grabTray = (e, id) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    const p = toSvg(e)
    const block = flag.blocks.find((b) => b.id === id)
    setTrayOrder((o) => o.filter((x) => x !== id))
    setLocs((prev) => {
      const loc = prev[id]
      const cl = clampCenter(block, p.x, p.y, loc.rot, loc.sx, loc.sy)
      return { ...prev, [id]: { ...loc, zone: 'board', x: cl.x, y: cl.y } }
    })
    drag.current = { id, mode: 'move', offX: 0, offY: 0 }
  }

  const startRotate = (e, id) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    const loc = locs[id]
    const p = toSvg(e)
    const a0 = (Math.atan2(p.y - loc.y, p.x - loc.x) * 180) / Math.PI
    drag.current = { id, mode: 'rotate', cx: loc.x, cy: loc.y, aPrev: a0, rot: loc.rot }
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current
      if (!d) return
      const p = toSvg(e)
      const block = flag.blocks.find((b) => b.id === d.id)
      if (d.mode === 'rotate') {
        // accumulate the per-frame angle change (normalized) so dragging is smooth
        // across the ±180° wrap and grabbing the handle never jumps the rotation
        const ang = (Math.atan2(p.y - d.cy, p.x - d.cx) * 180) / Math.PI
        let delta = ang - d.aPrev
        delta = ((((delta + 180) % 360) + 360) % 360) - 180
        d.rot += delta
        d.aPrev = ang
      }
      setLocs((prev) => {
        const loc = prev[d.id]
        if (!loc) return prev
        if (d.mode === 'move') {
          const cl = clampCenter(block, p.x - d.offX, p.y - d.offY, loc.rot, loc.sx, loc.sy)
          return { ...prev, [d.id]: { ...loc, zone: 'board', x: cl.x, y: cl.y } }
        }
        if (d.mode === 'rotate') {
          const cl = clampCenter(block, loc.x, loc.y, d.rot, loc.sx, loc.sy)
          return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, rot: d.rot } }
        }
        // resize: opposite edge/corner stays anchored; grow toward the pointer.
        const nat = dims(block)
        const ax = p.x - d.anchor.x
        const ay = p.y - d.anchor.y
        let sx = loc.sx
        let sy = loc.sy
        let cx = loc.x
        let cy = loc.y
        if (d.axis === 'x') {
          const width = d.signX * (ax * d.u.x + ay * d.u.y)
          sx = clampBetween((width / (2 * d.hw0)) * d.sx0, MIN_S, capX(block))
          const hw = (nat.w / 2) * sx
          cx = d.anchor.x + d.u.x * d.signX * hw
          cy = d.anchor.y + d.u.y * d.signX * hw
        } else if (d.axis === 'y') {
          const height = d.signY * (ax * d.v.x + ay * d.v.y)
          sy = clampBetween((height / (2 * d.hh0)) * d.sy0, MIN_S, capY(block))
          const hh = (nat.h / 2) * sy
          cx = d.anchor.x + d.v.x * d.signY * hh
          cy = d.anchor.y + d.v.y * d.signY * hh
        } else {
          // corner: even growth (same factor on both), anchored at the opposite corner
          const Dx = d.u.x * d.signX * 2 * d.hw0 + d.v.x * d.signY * 2 * d.hh0
          const Dy = d.u.y * d.signX * 2 * d.hw0 + d.v.y * d.signY * 2 * d.hh0
          const fraw = (ax * Dx + ay * Dy) / (Dx * Dx + Dy * Dy)
          // cap the shared factor so neither dimension exceeds MAX_S or the flag
          const fmin = Math.max(MIN_S / d.sx0, MIN_S / d.sy0)
          const fmax = Math.min(MAX_S / d.sx0, MAX_S / d.sy0, FLAG_W / (d.sx0 * nat.w), FLAG_H / (d.sy0 * nat.h))
          const f = clampBetween(fraw, fmin, fmax)
          sx = d.sx0 * f
          sy = d.sy0 * f
          const hw = (nat.w / 2) * sx
          const hh = (nat.h / 2) * sy
          cx = d.anchor.x + d.u.x * d.signX * hw + d.v.x * d.signY * hh
          cy = d.anchor.y + d.u.y * d.signX * hw + d.v.y * d.signY * hh
        }
        const cl = clampCenter(block, cx, cy, loc.rot, sx, sy)
        return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, sx, sy } }
      })
    }
    const onUp = (e) => {
      const d = drag.current
      drag.current = null
      document.body.style.cursor = ''
      if (!d) return
      const p = toSvg(e)
      if (p.y >= TRAY_Y0 && d.mode === 'move') {
        setLocs((prev) => ({ ...prev, [d.id]: { ...prev[d.id], zone: 'tray' } }))
        setTrayOrder((o) => (o.includes(d.id) ? o : [...o, d.id]))
        setSelected(null)
        return
      }
      if (d.mode === 'move' || d.mode === 'rotate') {
        const block = flag.blocks.find((b) => b.id === d.id)
        setLocs((prev) => {
          const loc = prev[d.id]
          if (!loc) return prev
          let rot = ((loc.rot % 360) + 360) % 360
          const nearest90 = Math.round(rot / 90) * 90
          if (Math.abs(rot - nearest90) <= SNAP_ROT_TOL) rot = nearest90 % 360
          const cl = clampCenter(block, loc.x, loc.y, rot, loc.sx, loc.sy)
          return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, rot } }
        })
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [toSvg, flag])

  const placedCount = flag.blocks.filter((b) => locs[b.id]?.zone === 'board').length

  const submit = () => {
    // Group interchangeable pieces, then take the best assignment within each group
    // so swapping identical pieces never costs points.
    const groups = new Map()
    for (const b of flag.blocks) {
      const sig = signature(b)
      if (!groups.has(sig)) groups.set(sig, [])
      groups.get(sig).push(b)
    }
    let total = 0
    for (const blocks of groups.values()) {
      total += bestGroupAccuracy(blocks[0], blocks.map((b) => locs[b.id]), blocks.map((b) => b.target))
    }
    const mean = total / flag.blocks.length
    const s = Math.round((1 + 9 * mean) * 100) / 100
    setScore(s)
    setSelected(null)
  }

  const boardBlocks = flag.blocks.filter((b) => locs[b.id]?.zone === 'board')

  // --- result view (after submit): your flag vs the real flag, side by side ---
  if (locked) {
    return (
      <div className="result">
        <span className="round-label">{roundLabel}</span>
        <h2 className="result-title">{flag.name}</h2>

        <div className="result-score">
          <span className="score-label">You scored</span>
          <span className="score-value">{score.toFixed(2)}</span>
          <span className="score-max">/ 10.00</span>
        </div>

        <div className="result-flags">
          <figure>
            <figcaption>Your flag</figcaption>
            <svg className="mini" viewBox={`0 0 ${FLAG_W} ${FLAG_H}`}>
              <clipPath id="flagclip"><rect x="0" y="0" width={FLAG_W} height={FLAG_H} /></clipPath>
              <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="#fff" stroke="none" />
              <g clipPath="url(#flagclip)">
                {boardBlocks.map((b) => {
                  const loc = locs[b.id]
                  return (
                    <g key={b.id} transform={`translate(${loc.x} ${loc.y}) rotate(${loc.rot})`}>
                      <g transform={`scale(${loc.sx} ${loc.sy})`}>
                        <Shape b={b} stroke="none" strokeW={0} />
                      </g>
                    </g>
                  )
                })}
              </g>
              <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="none" className="frame" strokeWidth="2" />
            </svg>
          </figure>
          <figure>
            <figcaption>Real flag</figcaption>
            <img className="mini real" src={flagUrl(flag.code)} alt={`Flag of ${flag.name}`} />
          </figure>
        </div>

        <div className="actions result-actions">
          <button className="btn ghost" onClick={reset}>Try again</button>
          <button className="btn" onClick={() => onNext(score)}>{isLast ? 'Finish' : 'Next flag →'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game">
      <div className="board-wrap">
        <svg ref={svgRef} className="board" viewBox={`-20 -20 ${VB_W} ${VB_H}`} onPointerDown={() => setSelected(null)}>
          <defs>
            <pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" className="ck-1" />
              <rect width="20" height="20" className="ck-2" />
              <rect x="20" y="20" width="20" height="20" className="ck-2" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="url(#checker)" />
          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="none" className="frame" strokeWidth="2" strokeDasharray="8 6" />

          <rect x={TRAY_LEFT - 4} y={TRAY_Y0} width={TRAY_WIDTH + 8} height={TRAY_Y1 - TRAY_Y0} rx="12" className="tray-box" />
          <text x={TRAY_LEFT + 6} y={TRAY_Y0 + 18} fontSize="14" className="tray-label">Pieces — drag onto the flag</text>

          {boardBlocks.map((b) => {
            const loc = locs[b.id]
            const isSel = selected === b.id
            const emblem = b.shape.kind === 'path' || b.shape.kind === 'image'
            const stroke = isSel ? '#3b82f6' : (emblem ? 'none' : 'rgba(125,133,144,0.55)')
            const strokeW = isSel ? 1.5 : 1
            // handle sits above the piece in SCREEN space (not the piece's frame) so it
            // never reveals which way is "up"; distance = the piece's bounding radius
            const R = Math.hypot(dims(b).w * loc.sx, dims(b).h * loc.sy) / 2
            return (
              <g key={b.id}>
                <g transform={`translate(${loc.x} ${loc.y}) rotate(${loc.rot})`} onPointerDown={(e) => grabBoard(e, b.id)} onPointerMove={(e) => hoverPiece(e, b)} style={{ cursor: locked ? 'default' : 'grab' }}>
                  <g transform={`scale(${loc.sx} ${loc.sy})`}>
                    <Shape b={b} stroke={stroke} strokeW={strokeW} />
                  </g>
                </g>
                {isSel && !locked && (
                  <g transform={`translate(${loc.x} ${loc.y})`}>
                    <line x1="0" y1={-R} x2="0" y2={-R - 24} stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <circle cx="0" cy={-R - 28} r="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} onPointerDown={(e) => startRotate(e, b.id)} />
                  </g>
                )}
              </g>
            )
          })}

          {trayOrder.map((id) => {
            const b = flag.blocks.find((x) => x.id === id)
            const t = trayLayout[id]
            if (!t) return null
            const rot = locs[id]?.rot || 0
            return (
              <g key={id} transform={`translate(${t.x} ${t.y}) scale(${t.scale}) rotate(${rot})`} onPointerDown={(e) => grabTray(e, id)} style={{ cursor: locked ? 'default' : 'grab' }}>
                <Shape b={b} stroke="rgba(125,133,144,0.55)" strokeW={1} />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="side">
        <span className="round-label">{roundLabel}</span>
        <h2>{flag.name}</h2>

        <p className="hint">Drag pieces from the tray and match the real flag as closely as you can — <strong>position, rotation, and size</strong> all count. Pieces start at random sizes: drag the middle of a piece to move it, grab an <strong>edge</strong> to resize that side, or a <strong>corner</strong> to resize evenly (symbols always resize evenly). Use the dot above a piece to rotate. Submit to score from 1.00 to 10.00.</p>

        <p className="status">{placedCount} / {flag.blocks.length} placed</p>

        <div className="actions">
          <button className="btn ghost" onClick={reset}>Shuffle / Reset</button>
          <button className="btn ghost" onClick={onSkip}>Skip</button>
          <button className="btn" onClick={submit}>Submit answer</button>
        </div>
      </div>
    </div>
  )
}
