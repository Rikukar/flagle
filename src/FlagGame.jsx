import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FLAG_W, FLAG_H } from './flags'

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
const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const randScale = () => rand(0.55, 1.55)
const clampScale = (v) => Math.min(MAX_S, Math.max(MIN_S, v))

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
const OVERLAY_STYLE = {
  left: `${(20 / VB_W) * 100}%`,
  top: `${(20 / VB_H) * 100}%`,
  width: `${(FLAG_W / VB_W) * 100}%`,
  height: `${(FLAG_H / VB_H) * 100}%`,
}

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

// --- canvas bounds (flag frame + tray) ---
const VB_MINX = -20
const VB_MAXX = -20 + VB_W
const VB_MINY = -20
const VB_MAXY = -20 + VB_H

// Keep a block's rotated, scaled bounding box inside the canvas by clamping its center.
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
  if (s.kind === 'circle') return <circle r={s.r} fill={b.color} stroke={stroke} strokeWidth={strokeW} vectorEffect={ve} />
  if (s.kind === 'path') {
    return <path d={s.d} transform={`translate(${-s.cx} ${-s.cy})`} fill={b.color} stroke={stroke === 'none' ? undefined : stroke} strokeWidth={stroke === 'none' ? 0 : strokeW} vectorEffect={ve} />
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
      const u = isUniform(b)
      const sx = randScale()
      next[b.id] = { zone: 'tray', x: 0, y: 0, rot: 0, sx, sy: u ? sx : randScale() }
    })
    setLocs(next)
    setTrayOrder(ids)
    setSelected(null)
    setScore(null)
  }, [flag])

  useEffect(() => { reset() }, [reset])

  const trayLayout = useMemo(() => {
    const items = trayOrder.map((id) => {
      const b = flag.blocks.find((x) => x.id === id)
      const d = dims(b)
      return { id, d, scale: Math.min(TRAY_MAX_SCALE, TRAY_INNER_H / d.h) }
    })
    let total = items.reduce((sum, it) => sum + it.d.w * it.scale, 0) + TRAY_GAP * Math.max(0, items.length - 1)
    const shrink = total > TRAY_WIDTH ? TRAY_WIDTH / total : 1
    items.forEach((it) => { it.scale *= shrink })
    total *= shrink
    const cy = (TRAY_Y0 + TRAY_Y1) / 2
    let x = TRAY_LEFT + Math.max(0, (TRAY_WIDTH - total) / 2)
    const map = {}
    items.forEach((it) => {
      const w = it.d.w * it.scale
      map[it.id] = { x: x + w / 2, y: cy, scale: it.scale }
      x += w + TRAY_GAP
    })
    return map
  }, [trayOrder, flag])

  const toSvg = useCallback((e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }, [])

  const locked = score !== null

  const grabBoard = (e, id) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    const p = toSvg(e)
    const loc = locs[id]
    drag.current = { id, mode: 'move', offX: p.x - loc.x, offY: p.y - loc.y }
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
      const cl = clampCenter(block, p.x, p.y, 0, loc.sx, loc.sy)
      return { ...prev, [id]: { ...loc, zone: 'board', x: cl.x, y: cl.y, rot: 0 } }
    })
    drag.current = { id, mode: 'move', offX: 0, offY: 0 }
  }

  const startRotate = (e, id) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    drag.current = { id, mode: 'rotate' }
  }

  const startResize = (e, id, axis) => {
    if (locked) return
    e.stopPropagation()
    setSelected(id)
    const block = flag.blocks.find((b) => b.id === id)
    const loc = locs[id]
    const nat = dims(block)
    const r = (loc.rot * Math.PI) / 180
    const u = { x: Math.cos(r), y: Math.sin(r) } // local +x (width) axis in world
    const v = { x: -Math.sin(r), y: Math.cos(r) } // local +y (height) axis in world
    const hw0 = (nat.w / 2) * loc.sx
    const hh0 = (nat.h / 2) * loc.sy
    // anchor = the edge/corner OPPOSITE the handle, kept fixed while dragging
    let ax = loc.x
    let ay = loc.y
    if (axis === 'x' || axis === 'uniform') { ax -= u.x * hw0; ay -= u.y * hw0 }
    if (axis === 'y' || axis === 'uniform') { ax -= v.x * hh0; ay -= v.y * hh0 }
    drag.current = { id, mode: 'resize', axis, u, v, hw0, hh0, sx0: loc.sx, sy0: loc.sy, nat, anchor: { x: ax, y: ay } }
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current
      if (!d) return
      const p = toSvg(e)
      const block = flag.blocks.find((b) => b.id === d.id)
      setLocs((prev) => {
        const loc = prev[d.id]
        if (!loc) return prev
        if (d.mode === 'move') {
          const cl = clampCenter(block, p.x - d.offX, p.y - d.offY, loc.rot, loc.sx, loc.sy)
          return { ...prev, [d.id]: { ...loc, zone: 'board', x: cl.x, y: cl.y } }
        }
        if (d.mode === 'rotate') {
          const ang = Math.atan2(p.y - loc.y, p.x - loc.x) * 180 / Math.PI + 90
          const cl = clampCenter(block, loc.x, loc.y, ang, loc.sx, loc.sy)
          return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, rot: ang } }
        }
        // resize: anchor the opposite edge/corner and grow toward the pointer.
        const ax = p.x - d.anchor.x
        const ay = p.y - d.anchor.y
        let sx = loc.sx
        let sy = loc.sy
        let cx = loc.x
        let cy = loc.y
        if (d.axis === 'x') {
          const f = (ax * d.u.x + ay * d.u.y) / (2 * d.hw0)
          sx = clampScale(d.sx0 * f)
          const hw = (d.nat.w / 2) * sx
          cx = d.anchor.x + d.u.x * hw
          cy = d.anchor.y + d.u.y * hw
        } else if (d.axis === 'y') {
          const f = (ax * d.v.x + ay * d.v.y) / (2 * d.hh0)
          sy = clampScale(d.sy0 * f)
          const hh = (d.nat.h / 2) * sy
          cx = d.anchor.x + d.v.x * hh
          cy = d.anchor.y + d.v.y * hh
        } else {
          // corner: even growth (same factor on both), anchored at the opposite corner
          const Dx = d.u.x * 2 * d.hw0 + d.v.x * 2 * d.hh0
          const Dy = d.u.y * 2 * d.hw0 + d.v.y * 2 * d.hh0
          const fraw = (ax * Dx + ay * Dy) / (Dx * Dx + Dy * Dy)
          const fmin = Math.max(MIN_S / d.sx0, MIN_S / d.sy0)
          const fmax = Math.min(MAX_S / d.sx0, MAX_S / d.sy0)
          const f = Math.min(fmax, Math.max(fmin, fraw))
          sx = d.sx0 * f
          sy = d.sy0 * f
          const hw = (d.nat.w / 2) * sx
          const hh = (d.nat.h / 2) * sy
          cx = d.anchor.x + d.u.x * hw + d.v.x * hh
          cy = d.anchor.y + d.u.y * hw + d.v.y * hh
        }
        const cl = clampCenter(block, cx, cy, loc.rot, sx, sy)
        return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, sx, sy } }
      })
    }
    const onUp = (e) => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const p = toSvg(e)
      if (p.y >= TRAY_Y0 && d.mode === 'move') {
        setLocs((prev) => ({ ...prev, [d.id]: { ...prev[d.id], zone: 'tray', rot: 0 } }))
        setTrayOrder((o) => (o.includes(d.id) ? o : [...o, d.id]))
        setSelected(null)
        return
      }
      if (d.mode === 'move' || d.mode === 'rotate') {
        const block = flag.blocks.find((b) => b.id === d.id)
        setLocs((prev) => {
          const loc = prev[d.id]
          if (!loc) return prev
          let { rot } = loc
          const nearest90 = Math.round(rot / 90) * 90
          if (Math.abs(rot - nearest90) <= SNAP_ROT_TOL) rot = nearest90
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

  // small white square resize handle
  const ResizeHandle = ({ x, y, id, axis, cursor }) => (
    <rect x={x - 7} y={y - 7} width="14" height="14" rx="2" fill="#fff" stroke="#3b82f6" strokeWidth="3" style={{ cursor }} onPointerDown={(e) => startResize(e, id, axis)} />
  )

  return (
    <div className="game">
      <div className="board-wrap">
        <svg ref={svgRef} className="board" viewBox={`-20 -20 ${VB_W} ${VB_H}`} onPointerDown={() => setSelected(null)}>
          <defs>
            <pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#e9edf2" />
              <rect width="20" height="20" fill="#dde3ea" />
              <rect x="20" y="20" width="20" height="20" fill="#dde3ea" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="url(#checker)" />
          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="none" stroke="#9aa6b2" strokeWidth="2" strokeDasharray="8 6" />

          <rect x={TRAY_LEFT - 4} y={TRAY_Y0} width={TRAY_WIDTH + 8} height={TRAY_Y1 - TRAY_Y0} rx="12" fill="#eef1f5" stroke="#d4dae1" />
          <text x={TRAY_LEFT + 6} y={TRAY_Y0 + 18} fontSize="14" fill="#7b8794">Pieces — drag onto the flag</text>

          {boardBlocks.map((b) => {
            const loc = locs[b.id]
            const isSel = selected === b.id
            const emblem = b.shape.kind === 'path' || b.shape.kind === 'image'
            const stroke = isSel ? '#3b82f6' : (emblem ? 'none' : 'rgba(0,0,0,0.25)')
            const strokeW = isSel ? (b.shape.kind === 'path' ? 4 : 3) : 1
            const nat = dims(b)
            const ex = (nat.w / 2) * loc.sx // visible half-width
            const ey = (nat.h / 2) * loc.sy // visible half-height
            return (
              <g key={b.id} transform={`translate(${loc.x} ${loc.y}) rotate(${loc.rot})`} onPointerDown={(e) => grabBoard(e, b.id)} style={{ cursor: locked ? 'default' : 'grab' }}>
                <g transform={`scale(${loc.sx} ${loc.sy})`}>
                  <Shape b={b} stroke={stroke} strokeW={strokeW} />
                </g>
                {isSel && !locked && (
                  <g>
                    {/* rotate */}
                    <line x1="0" y1={-ey} x2="0" y2={-ey - 34} stroke="#3b82f6" strokeWidth="3" />
                    <circle cx="0" cy={-ey - 40} r="12" fill="#fff" stroke="#3b82f6" strokeWidth="3" style={{ cursor: 'grab' }} onPointerDown={(e) => startRotate(e, b.id)} />
                    {/* resize */}
                    {isUniform(b) ? (
                      <ResizeHandle x={ex} y={ey} id={b.id} axis="uniform" cursor="nwse-resize" />
                    ) : (
                      <>
                        <ResizeHandle x={ex} y={0} id={b.id} axis="x" cursor="ew-resize" />
                        <ResizeHandle x={0} y={ey} id={b.id} axis="y" cursor="ns-resize" />
                        <ResizeHandle x={ex} y={ey} id={b.id} axis="uniform" cursor="nwse-resize" />
                      </>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {trayOrder.map((id) => {
            const b = flag.blocks.find((x) => x.id === id)
            const t = trayLayout[id]
            if (!t) return null
            return (
              <g key={id} transform={`translate(${t.x} ${t.y}) scale(${t.scale})`} onPointerDown={(e) => grabTray(e, id)} style={{ cursor: locked ? 'default' : 'grab' }}>
                <Shape b={b} stroke="rgba(0,0,0,0.25)" strokeW={1 / t.scale} />
              </g>
            )
          })}
        </svg>

        {locked && (
          <div className="flag-overlay" style={OVERLAY_STYLE}>
            <span className={`fi fi-${flag.code}`} />
          </div>
        )}
      </div>

      <div className="side">
        <span className="round-label">{roundLabel}</span>
        <h2>{flag.name}</h2>

        {!locked ? (
          <>
            <p className="hint">Drag pieces from the tray and match the real flag as closely as you can — <strong>position, rotation, and size</strong> all count. Pieces start at random sizes: select one, then drag the square handles to resize (symbols resize evenly). Nothing snaps to the answer. Submit to score from 1.00 to 10.00.</p>

            <p className="status">{placedCount} / {flag.blocks.length} placed</p>

            <div className="actions">
              <button className="btn ghost" onClick={reset}>Shuffle / Reset</button>
              <button className="btn ghost" onClick={onSkip}>Skip</button>
              <button className="btn" onClick={submit}>Submit answer</button>
            </div>
          </>
        ) : (
          <>
            <div className="scorecard">
              <span className="score-label">Your flag scored</span>
              <span className="score-value">{score.toFixed(2)}</span>
              <span className="score-max">/ 10.00</span>
            </div>
            <p className="hint">The real flag is overlaid on yours so you can see how close you got.</p>
            <div className="actions">
              <button className="btn ghost" onClick={reset}>Try again</button>
              <button className="btn" onClick={() => onNext(score)}>{isLast ? 'Finish' : 'Next flag →'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
