import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FLAG_W, FLAG_H } from './flags'

const POS_TOL = 30 // how close (units) a block must be to count as placed
const ROT_TOL = 6 // degrees of slack for the win check
const SNAP_ROT_TOL = 12 // snap to nearest 90deg on release within this
const SNAP_POS_TOL = 34 // snap to exact target on release within this

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

// Natural (unscaled) bounding size of a block's shape.
function dims(b) {
  const s = b.shape
  if (s.kind === 'rect') return { w: s.w, h: s.h }
  if (s.kind === 'circle') return { w: 2 * s.r, h: 2 * s.r }
  if (s.kind === 'image') return { w: s.w, h: s.h }
  return { w: 2 * s.half, h: 2 * s.half } // path
}

// Smallest absolute angle difference given a symmetry period.
function angleDiff(a, b, period) {
  if (period === 'full') return 0
  let d = (((a - b) % period) + period) % period
  if (d > period / 2) d = period - d
  return Math.abs(d)
}

function isSolved(block, loc) {
  if (!loc || loc.zone !== 'board') return false
  const dist = Math.hypot(loc.x - block.target.x, loc.y - block.target.y)
  const rotOk = angleDiff(loc.rot, block.target.rot, block.sym) <= ROT_TOL
  return dist <= POS_TOL && rotOk
}

// Draws a block's shape centered on (0,0) in its own local frame.
function Shape({ b, stroke, strokeW }) {
  const s = b.shape
  if (s.kind === 'rect') {
    return <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill={b.color} stroke={stroke} strokeWidth={strokeW} />
  }
  if (s.kind === 'circle') {
    return <circle r={s.r} fill={b.color} stroke={stroke} strokeWidth={strokeW} />
  }
  if (s.kind === 'path') {
    return (
      <path
        d={s.d}
        transform={`translate(${-s.cx} ${-s.cy})`}
        fill={b.color}
        stroke={stroke === 'none' ? undefined : stroke}
        strokeWidth={stroke === 'none' ? 0 : strokeW}
      />
    )
  }
  // image
  return (
    <>
      <image href={s.href} x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} />
      {stroke !== 'none' && (
        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill="none" stroke={stroke} strokeWidth={strokeW} strokeDasharray="6 4" />
      )}
    </>
  )
}

export default function FlagGame({ flag, roundLabel, isLast, onNext, onSkip }) {
  const svgRef = useRef(null)
  const [locs, setLocs] = useState({}) // id -> {zone:'board'|'tray', x, y, rot}
  const [trayOrder, setTrayOrder] = useState([]) // ids currently in the tray
  const [selected, setSelected] = useState(null)
  const [peek, setPeek] = useState(false)
  const drag = useRef(null) // { id, mode:'move'|'rotate', offX, offY }

  // Reset: every piece returns to the tray in a shuffled order.
  const reset = useCallback(() => {
    const ids = flag.blocks.map((b) => b.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const next = {}
    flag.blocks.forEach((b) => { next[b.id] = { zone: 'tray', x: 0, y: 0, rot: 0 } })
    setLocs(next)
    setTrayOrder(ids)
    setSelected(null)
  }, [flag])

  useEffect(() => { reset() }, [reset])

  // Tray layout: scale each piece to fit, lay out left-to-right, no overlap.
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
    let x = TRAY_LEFT + Math.max(0, (TRAY_WIDTH - total) / 2) // center the row
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

  // Grab a board piece (preserve grab offset).
  const grabBoard = (e, id) => {
    e.stopPropagation()
    setSelected(id)
    const p = toSvg(e)
    const loc = locs[id]
    drag.current = { id, mode: 'move', offX: p.x - loc.x, offY: p.y - loc.y }
  }

  // Grab a tray piece: pop it to full size on the board, centered under the cursor.
  const grabTray = (e, id) => {
    e.stopPropagation()
    setSelected(id)
    const p = toSvg(e)
    setTrayOrder((o) => o.filter((x) => x !== id))
    setLocs((prev) => ({ ...prev, [id]: { zone: 'board', x: p.x, y: p.y, rot: 0 } }))
    drag.current = { id, mode: 'move', offX: 0, offY: 0 }
  }

  const startRotate = (e, id) => {
    e.stopPropagation()
    setSelected(id)
    drag.current = { id, mode: 'rotate' }
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current
      if (!d) return
      const p = toSvg(e)
      setLocs((prev) => {
        const loc = prev[d.id]
        if (!loc) return prev
        if (d.mode === 'move') {
          return { ...prev, [d.id]: { ...loc, zone: 'board', x: p.x - d.offX, y: p.y - d.offY } }
        }
        const ang = Math.atan2(p.y - loc.y, p.x - loc.x) * 180 / Math.PI + 90
        return { ...prev, [d.id]: { ...loc, rot: ang } }
      })
    }
    const onUp = (e) => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const p = toSvg(e)
      const block = flag.blocks.find((b) => b.id === d.id)
      // Dropped over the tray -> send it back.
      if (p.y >= TRAY_Y0 && d.mode === 'move') {
        setLocs((prev) => ({ ...prev, [d.id]: { zone: 'tray', x: 0, y: 0, rot: 0 } }))
        setTrayOrder((o) => (o.includes(d.id) ? o : [...o, d.id]))
        setSelected(null)
        return
      }
      setLocs((prev) => {
        const loc = prev[d.id]
        if (!loc) return prev
        let { x, y, rot } = loc
        const nearest90 = Math.round(rot / 90) * 90
        if (Math.abs(rot - nearest90) <= SNAP_ROT_TOL) rot = nearest90
        if (Math.hypot(x - block.target.x, y - block.target.y) <= SNAP_POS_TOL) {
          x = block.target.x
          y = block.target.y
        }
        return { ...prev, [d.id]: { zone: 'board', x, y, rot } }
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [toSvg, flag])

  const solvedMap = useMemo(() => {
    const m = {}
    for (const b of flag.blocks) m[b.id] = isSolved(b, locs[b.id])
    return m
  }, [flag, locs])

  const won = flag.blocks.every((b) => solvedMap[b.id])

  const boardBlocks = flag.blocks.filter((b) => locs[b.id]?.zone === 'board')

  return (
    <div className="game">
      <div className="board-wrap">
        <svg
          ref={svgRef}
          className="board"
          viewBox={`-20 -20 ${FLAG_W + 40} ${TRAY_Y1 + 20}`}
          onPointerDown={() => setSelected(null)}
        >
          <defs>
            <pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#e9edf2" />
              <rect width="20" height="20" fill="#dde3ea" />
              <rect x="20" y="20" width="20" height="20" fill="#dde3ea" />
            </pattern>
          </defs>

          {/* flag target area */}
          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="url(#checker)" />
          <rect x="0" y="0" width={FLAG_W} height={FLAG_H} fill="none" stroke="#9aa6b2" strokeWidth="2" strokeDasharray="8 6" />

          {/* tray */}
          <rect x={TRAY_LEFT - 4} y={TRAY_Y0} width={TRAY_WIDTH + 8} height={TRAY_Y1 - TRAY_Y0} rx="12" fill="#eef1f5" stroke="#d4dae1" />
          <text x={TRAY_LEFT + 6} y={TRAY_Y0 + 18} fontSize="14" fill="#7b8794">Pieces — drag onto the flag</text>

          {/* board pieces */}
          {boardBlocks.map((b) => {
            const loc = locs[b.id]
            const isSel = selected === b.id
            const stroke = solvedMap[b.id] ? '#1f9d55' : (isSel ? '#3b82f6' : (b.shape.kind === 'path' || b.shape.kind === 'image' ? 'none' : 'rgba(0,0,0,0.25)'))
            const strokeW = isSel || solvedMap[b.id] ? (b.shape.kind === 'path' ? 6 : 4) : 1
            const halfTop = dims(b).h / 2
            return (
              <g key={b.id} transform={`translate(${loc.x} ${loc.y}) rotate(${loc.rot})`} onPointerDown={(e) => grabBoard(e, b.id)} style={{ cursor: 'grab' }}>
                <Shape b={b} stroke={stroke} strokeW={strokeW} />
                {isSel && (
                  <g>
                    <line x1="0" y1={-halfTop} x2="0" y2={-halfTop - 34} stroke="#3b82f6" strokeWidth="3" />
                    <circle cx="0" cy={-halfTop - 40} r="12" fill="#fff" stroke="#3b82f6" strokeWidth="3" style={{ cursor: 'grab' }} onPointerDown={(e) => startRotate(e, b.id)} />
                  </g>
                )}
              </g>
            )
          })}

          {/* tray pieces */}
          {trayOrder.map((id) => {
            const b = flag.blocks.find((x) => x.id === id)
            const t = trayLayout[id]
            if (!t) return null
            return (
              <g key={id} transform={`translate(${t.x} ${t.y}) scale(${t.scale})`} onPointerDown={(e) => grabTray(e, id)} style={{ cursor: 'grab' }}>
                <Shape b={b} stroke="rgba(0,0,0,0.25)" strokeW={1 / t.scale} />
              </g>
            )
          })}
        </svg>

        {won && <div className="win-badge">Correct! 🎉</div>}
      </div>

      <div className="side">
        <span className="round-label">{roundLabel}</span>
        <h2>{flag.name}</h2>
        <p className="hint">Drag every piece from the tray onto the flag. Drag the body to move, the blue dot to rotate. Pieces snap to level and turn green when correct. Drop a piece back in the tray to undo.</p>

        <div className="ref">
          <button className="btn ghost" onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)}>
            👁 Hold to peek
          </button>
          {peek && <span className={`fi fi-${flag.code} fis ref-flag`} />}
        </div>

        <p className="status">{flag.blocks.filter((b) => solvedMap[b.id]).length} / {flag.blocks.length} placed</p>

        <div className="actions">
          <button className="btn ghost" onClick={reset}>Shuffle / Reset</button>
          <button className="btn ghost" onClick={onSkip}>Skip</button>
          <button className="btn" disabled={!won} onClick={onNext}>{isLast ? 'Finish' : 'Next flag →'}</button>
        </div>
      </div>
    </div>
  )
}
