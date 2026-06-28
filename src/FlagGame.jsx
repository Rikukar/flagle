import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FLAG_W, FLAG_H } from './flags'
import { flagUrl } from './flagAssets'
import {
  MIN_S, MAX_S, clampBetween, isUniform, dims, capX, capY, capU,
  trig, fitFactor, maxSx, maxSy, clampCenter, signature, bestGroupAccuracy,
} from './geometry'

const SNAP_ROT_TOL = 12 // snap to nearest 90deg (level) on release — a usability aid only

// Random starting state for scattered pieces.
const EDGE = 22 // grab band (units) near a piece edge/corner that starts a resize
const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const randScale = () => rand(0.3, 0.6) // start small so pieces don't fill the flag
const randRot = () => Math.random() * 360

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

// ---------- pixel scoring: compare the built flag to the real one ----------
const assetTextCache = {}
async function inlineAssetSvg(href, x, y, w, h) {
  if (!assetTextCache[href]) assetTextCache[href] = await (await fetch(href)).text()
  return assetTextCache[href].replace(
    /<svg([^>]*)>/,
    (m, attrs) => `<svg${attrs} x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none">`,
  )
}

// Serialize the player's current arrangement to a standalone SVG (clipped to the
// flag frame, transparent background so uncovered area can never score).
async function builtFlagSvg(flag, locs) {
  let inner = ''
  for (const b of flag.blocks) {
    const loc = locs[b.id]
    if (!loc || loc.zone !== 'board') continue
    const s = b.shape
    let el = ''
    if (s.kind === 'rect') el = `<rect x="${-s.w / 2}" y="${-s.h / 2}" width="${s.w}" height="${s.h}" fill="${b.color}"/>`
    else if (s.kind === 'circle') el = `<circle r="${s.r}" fill="${b.color}"/>`
    else if (s.kind === 'path') el = `<path d="${s.d}" transform="translate(${-s.cx} ${-s.cy})${s.pre ? ' ' + s.pre : ''}" fill="${b.color}"/>`
    else if (s.kind === 'image') el = await inlineAssetSvg(s.href, -s.w / 2, -s.h / 2, s.w, s.h)
    inner += `<g transform="translate(${loc.x} ${loc.y}) rotate(${loc.rot})"><g transform="scale(${loc.sx} ${loc.sy})">${el}</g></g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${FLAG_W} ${FLAG_H}" width="${FLAG_W}" height="${FLAG_H}"><defs><clipPath id="fc"><rect width="${FLAG_W}" height="${FLAG_H}"/></clipPath></defs><g clip-path="url(#fc)">${inner}</g></svg>`
}

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img load failed')); i.src = src })

// Fraction (0..1) of the flag area whose color matches the real flag.
async function pixelAccuracy(flag, locs, realUrl) {
  const W = 320
  const H = 240
  const [mine, real] = await Promise.all([
    builtFlagSvg(flag, locs).then((s) => loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s))),
    loadImg(realUrl),
  ])
  const draw = (img) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, W, H)
    return ctx.getImageData(0, 0, W, H).data
  }
  const d1 = draw(mine)
  const d2 = draw(real)
  let good = 0
  const total = W * H
  for (let i = 0; i < d1.length; i += 4) {
    if (d1[i + 3] < 200) continue // uncovered flag area counts as wrong
    const diff = Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2])
    if (diff <= 90) good++
  }
  return good / total
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
    // s.pre (optional) maps the raw path coords into 640x480 flag space, for
    // sources whose SVGs use a different internal coordinate system.
    return (
      <>
        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill="transparent" />
        <path d={s.d} transform={`translate(${-s.cx} ${-s.cy})${s.pre ? ' ' + s.pre : ''}`} fill={b.color} stroke={stroke === 'none' ? undefined : stroke} strokeWidth={stroke === 'none' ? 0 : strokeW} vectorEffect={ve} />
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

export default function FlagGame({ flag, roundLabel, isLast, onNext, onSkip, mode, onScored }) {
  const svgRef = useRef(null)
  const [locs, setLocs] = useState({}) // id -> {zone, x, y, rot, sx, sy}
  const [trayOrder, setTrayOrder] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(null)
  const drag = useRef(null)
  const submitting = useRef(false) // { id, mode:'move'|'rotate'|'resize', offX, offY, axis }

  const reset = useCallback(() => {
    const ids = flag.blocks.map((b) => b.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const next = {}
    flag.blocks.forEach((b) => {
      const rot = randRot()
      // per-piece slider calibration: random rotation offset and random track
      // ranges so the correct value never sits at a recognizable slider position
      const ui = {
        rotOff: Math.random() * 360,
        maxX: Math.min(capX(b), rand(1.15, MAX_S)),
        maxY: Math.min(capY(b), rand(1.15, MAX_S)),
        maxU: Math.min(capU(b), rand(1.15, MAX_S)),
      }
      if (isUniform(b)) {
        const s = clampBetween(randScale(), MIN_S, capU(b))
        next[b.id] = { zone: 'tray', x: 0, y: 0, rot, sx: s, sy: s, ui }
      } else {
        const sx = clampBetween(randScale(), MIN_S, capX(b))
        const sy = clampBetween(randScale(), MIN_S, capY(b))
        next[b.id] = { zone: 'tray', x: 0, y: 0, rot, sx, sy, ui }
      }
    })
    setLocs(next)
    setTrayOrder(ids)
    setSelected(null)
    setScore(null)
  }, [flag])

  useEffect(() => { reset() }, [reset])

  // Scroll wheel rotates the selected piece (3° per notch, snapping when close to level).
  const selectedRef = useRef(null)
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e) => {
      const id = selectedRef.current
      if (!id || score !== null) return
      e.preventDefault()
      const block = flag.blocks.find((b) => b.id === id)
      setLocs((prev) => {
        const loc = prev[id]
        if (!loc || loc.zone !== 'board') return prev
        let rot = loc.rot + (e.deltaY > 0 ? 3 : -3)
        const n90 = Math.round(rot / 90) * 90
        if (Math.abs(rot - n90) < 2.99) rot = n90 // gentle level-snap, escapable on the next notch
        rot = ((rot % 360) + 360) % 360
        const cl = clampCenter(block, loc.x, loc.y, rot, loc.sx, loc.sy)
        return { ...prev, [id]: { ...loc, x: cl.x, y: cl.y, rot } }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [flag, score])

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
    // gaps are a fixed size, so only the pieces themselves get shrunk to fit
    const gaps = TRAY_GAP * Math.max(0, items.length - 1)
    const sumW = items.reduce((sum, it) => sum + it.rw * it.scale, 0)
    const avail = Math.max(1, TRAY_WIDTH - gaps)
    const shrink = sumW > avail ? avail / sumW : 1
    items.forEach((it) => { it.scale *= shrink })
    const total = items.reduce((sum, it) => sum + it.rw * it.scale, 0) + gaps
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

  // Click a tray piece to place it on the flag (centered), ready to position.
  const placeFromTray = (e, id) => {
    if (locked) return
    e.stopPropagation()
    const block = flag.blocks.find((b) => b.id === id)
    setTrayOrder((o) => o.filter((x) => x !== id))
    setLocs((prev) => {
      const loc = prev[id]
      const cl = clampCenter(block, FLAG_W / 2, FLAG_H / 2, loc.rot, loc.sx, loc.sy)
      return { ...prev, [id]: { ...loc, zone: 'board', x: cl.x, y: cl.y } }
    })
    setSelected(id)
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
          // if the new orientation doesn't fit the flag, shrink the piece to fit
          const f = fitFactor(block, d.rot, loc.sx, loc.sy)
          const sx = loc.sx * f
          const sy = loc.sy * f
          const cl = clampCenter(block, loc.x, loc.y, d.rot, sx, sy)
          return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, rot: d.rot, sx, sy } }
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
          sx = clampBetween((width / (2 * d.hw0)) * d.sx0, MIN_S, maxSx(block, loc.rot, loc.sy))
          const hw = (nat.w / 2) * sx
          cx = d.anchor.x + d.u.x * d.signX * hw
          cy = d.anchor.y + d.u.y * d.signX * hw
        } else if (d.axis === 'y') {
          const height = d.signY * (ax * d.v.x + ay * d.v.y)
          sy = clampBetween((height / (2 * d.hh0)) * d.sy0, MIN_S, maxSy(block, loc.rot, loc.sx))
          const hh = (nat.h / 2) * sy
          cx = d.anchor.x + d.v.x * d.signY * hh
          cy = d.anchor.y + d.v.y * d.signY * hh
        } else {
          // corner: even growth (same factor on both), anchored at the opposite corner
          const Dx = d.u.x * d.signX * 2 * d.hw0 + d.v.x * d.signY * 2 * d.hh0
          const Dy = d.u.y * d.signX * 2 * d.hw0 + d.v.y * d.signY * 2 * d.hh0
          const fraw = (ax * Dx + ay * Dy) / (Dx * Dx + Dy * Dy)
          // cap the shared factor: MAX_S per axis, and the ROTATED bbox must fit the flag
          const fmin = Math.max(MIN_S / d.sx0, MIN_S / d.sy0)
          const { c: tc, s: ts } = trig(loc.rot)
          const exW0 = nat.w * d.sx0 * tc + nat.h * d.sy0 * ts
          const exH0 = nat.w * d.sx0 * ts + nat.h * d.sy0 * tc
          const fmax = Math.min(MAX_S / d.sx0, MAX_S / d.sy0, FLAG_W / exW0, FLAG_H / exH0)
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
          const f = fitFactor(block, rot, loc.sx, loc.sy)
          const sx = loc.sx * f
          const sy = loc.sy * f
          const cl = clampCenter(block, loc.x, loc.y, rot, sx, sy)
          return { ...prev, [d.id]: { ...loc, x: cl.x, y: cl.y, rot, sx, sy } }
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

  const submit = async () => {
    if (drag.current || submitting.current) return
    submitting.current = true
    let mean
    try {
      // Score = the fraction of the flag's area that is colored correctly,
      // comparing the built flag pixel-by-pixel against the real one.
      mean = await pixelAccuracy(flag, locs, flagUrl(flag.code))
      // a pixel-perfect build still loses a sliver to edge antialiasing — forgive it
      mean = Math.min(1, mean / 0.985)
    } catch {
      // fallback: per-piece scoring (best assignment within interchangeable groups)
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
      mean = total / flag.blocks.length
    }
    submitting.current = false
    const s = Math.round(mean * 10 * 100) / 100 // 0.00–10.00
    setScore(s)
    setSelected(null)
    onScored?.(s)
  }

  const boardBlocks = flag.blocks.filter((b) => locs[b.id]?.zone === 'board')

  // --- slider controls for the selected piece ---
  const selBlock = selected ? flag.blocks.find((b) => b.id === selected) : null
  const selLoc = selBlock ? locs[selected] : null
  const selOnBoard = selLoc && selLoc.zone === 'board'

  const setSelRot = (deg) => {
    // gentle magnetism to level orientations (the random track offset would
    // otherwise make exactly-level unreachable with discrete slider steps)
    const n90 = Math.round(deg / 90) * 90
    if (Math.abs(deg - n90) <= 3) deg = n90
    setLocs((prev) => {
      const loc = prev[selected]
      if (!loc) return prev
      // shrink to fit if this orientation doesn't fit the flag
      const f = fitFactor(selBlock, deg, loc.sx, loc.sy)
      const sx = loc.sx * f
      const sy = loc.sy * f
      const cl = clampCenter(selBlock, loc.x, loc.y, deg, sx, sy)
      return { ...prev, [selected]: { ...loc, x: cl.x, y: cl.y, rot: deg, sx, sy } }
    })
  }

  const setSelScale = (axis, v) => {
    setLocs((prev) => {
      const loc = prev[selected]
      if (!loc) return prev
      let { sx, sy } = loc
      if (axis === 'uniform') {
        // largest uniform scale whose rotated bbox still fits the flag
        const { w, h } = dims(selBlock)
        const { c, s } = trig(loc.rot)
        const vMax = Math.min(FLAG_W / (w * c + h * s), FLAG_H / (w * s + h * c))
        const vv = Math.min(v, vMax)
        sx = vv; sy = vv
      }
      else if (axis === 'x') sx = Math.min(v, maxSx(selBlock, loc.rot, sy))
      else sy = Math.min(v, maxSy(selBlock, loc.rot, sx))
      const cl = clampCenter(selBlock, loc.x, loc.y, loc.rot, sx, sy)
      return { ...prev, [selected]: { ...loc, x: cl.x, y: cl.y, sx, sy } }
    })
  }

  // slider shows rotation through a per-piece random offset so "0 on the track"
  // never means "level"; the piece itself is the only feedback
  const selUi = selLoc?.ui || { rotOff: 0, maxX: MAX_S, maxY: MAX_S, maxU: MAX_S }
  const dispRot = selLoc ? (((selLoc.rot - selUi.rotOff) % 360) + 360) % 360 : 0

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
          {mode !== 'daily' && <button className="btn ghost" onClick={reset}>Try again</button>}
          <button className="btn" onClick={() => onNext(score)}>{isLast ? 'Finish' : 'Next flag →'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game with-controls">
      <div className="controls">
        <span className="controls-title">Piece controls</span>
        {selBlock && selOnBoard ? (
          <>
            <label className="ctl">
              <span className="ctl-label">Rotation</span>
              <input
                type="range" min="0" max="360" step="0.5" value={dispRot}
                onChange={(e) => setSelRot(+e.target.value + selUi.rotOff)}
              />
            </label>
            {isUniform(selBlock) ? (
              <label className="ctl">
                <span className="ctl-label">Size</span>
                <input
                  type="range" min={MIN_S} max={selUi.maxU} step="0.005" value={selLoc.sx}
                  onChange={(e) => setSelScale('uniform', +e.target.value)}
                />
              </label>
            ) : (
              <>
                <label className="ctl">
                  <span className="ctl-label">Width</span>
                  <input
                    type="range" min={MIN_S} max={selUi.maxX} step="0.005" value={selLoc.sx}
                    onChange={(e) => setSelScale('x', +e.target.value)}
                  />
                </label>
                <label className="ctl">
                  <span className="ctl-label">Height</span>
                  <input
                    type="range" min={MIN_S} max={selUi.maxY} step="0.005" value={selLoc.sy}
                    onChange={(e) => setSelScale('y', +e.target.value)}
                  />
                </label>
              </>
            )}
          </>
        ) : (
          <p className="controls-empty">Select a piece on the flag to adjust its rotation and size.</p>
        )}
      </div>

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
          <text x={TRAY_LEFT + 6} y={TRAY_Y0 + 18} fontSize="14" className="tray-label">Pieces — click to place on the flag</text>

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
                    {/* invisible rotate ring: grab just outside the piece and drag around it */}
                    <circle
                      className="rotate-ring"
                      r={R + 14}
                      fill="none"
                      strokeWidth="26"
                      pointerEvents="stroke"
                      onPointerDown={(e) => startRotate(e, b.id)}
                    />
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
              <g key={id} transform={`translate(${t.x} ${t.y}) scale(${t.scale}) rotate(${rot})`} onPointerDown={(e) => placeFromTray(e, id)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                <Shape b={b} stroke="rgba(125,133,144,0.55)" strokeW={1} />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="side">
        <span className="round-label">{roundLabel}</span>
        <h2>{flag.name}</h2>

        <p className="hint">Click a piece in the tray to place it on the flag, then recreate the real flag as closely as you can. Drag the middle of a piece to move it, grab an <strong>edge</strong> to resize that side, or a <strong>corner</strong> to resize evenly (symbols always resize evenly); rotate by dragging just outside a piece or with the slider. Your score (0.00–10.00) is <strong>how much of the flag's area you colored correctly</strong> — uncovered area counts as wrong, so build the whole flag.</p>

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
