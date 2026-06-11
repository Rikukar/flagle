import { useEffect, useState } from 'react'
import { FLAGS } from './flags'
import FlagGame from './FlagGame'

const ROUND_SIZE = 5

// --- deterministic RNG so the daily round is identical for everyone ---
function hashStr(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pickN(arr, n, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dailyRounds = () => pickN(FLAGS, ROUND_SIZE, mulberry32(hashStr('flagle-' + todayKey())))
const endlessRounds = () => pickN(FLAGS, ROUND_SIZE, Math.random)

const dailyStoreKey = () => 'flagle-daily-' + todayKey()
const loadDailyResult = () => {
  try { return JSON.parse(localStorage.getItem(dailyStoreKey())) } catch { return null }
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  return (
    <button className="pill-btn" onClick={onToggle} aria-label="Toggle dark mode" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
      <span className="pill-btn-text">{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}

export default function App() {
  const [mode, setMode] = useState(null) // null | 'daily' | 'endless'
  const [rounds, setRounds] = useState([])
  const [idx, setIdx] = useState(0)
  const [scores, setScores] = useState([])
  const [done, setDone] = useState(false)
  const [dailyResult, setDailyResult] = useState(loadDailyResult())
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('flagle-theme')
    if (saved) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('flagle-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const startMode = (m) => {
    if (m === 'daily' && dailyResult) return // already played today
    setRounds(m === 'daily' ? dailyRounds() : endlessRounds())
    setIdx(0)
    setScores([])
    setDone(false)
    setMode(m)
  }

  const backToMenu = () => { setMode(null); setDone(false) }

  const flag = rounds[idx]
  const isLast = idx === rounds.length - 1

  const advance = (score) => {
    // a skipped flag counts as 0 points and still shows in the summary
    const entry = score != null ? { name: flag.name, score } : { name: flag.name, score: 0, skipped: true }
    const nextScores = [...scores, entry]
    setScores(nextScores)
    if (isLast) {
      if (mode === 'daily') {
        const avg = nextScores.length ? nextScores.reduce((s, r) => s + r.score, 0) / nextScores.length : 0
        const result = { date: todayKey(), avg, scores: nextScores }
        try { localStorage.setItem(dailyStoreKey(), JSON.stringify(result)) } catch { /* ignore */ }
        setDailyResult(result)
      }
      setDone(true)
    } else {
      setIdx((i) => i + 1)
    }
  }

  const newEndless = () => {
    setRounds(endlessRounds())
    setIdx(0)
    setScores([])
    setDone(false)
  }

  const header = (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⚑</span>
        <h1>Flagle</h1>
      </div>
      <div className="topbar-actions">
        {mode && <button className="pill-btn" onClick={backToMenu}>☰ <span className="pill-btn-text">Menu</span></button>}
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  )

  // ---------- menu ----------
  if (!mode) {
    return (
      <div className="app">
        {header}
        <p className="tagline">Build each flag from its scattered pieces — match position, rotation, and size as closely as you can.</p>
        <div className="mode-grid">
          {dailyResult ? (
            <div className="mode-card done" aria-disabled="true">
              <span className="mode-emoji" aria-hidden="true">✅</span>
              <span className="mode-title">Daily Challenge</span>
              <span className="mode-desc">Done for today — you averaged <strong>{dailyResult.avg.toFixed(2)}</strong> / 10.00.</span>
              <span className="mode-tag">Come back tomorrow</span>
            </div>
          ) : (
            <button className="mode-card" onClick={() => startMode('daily')}>
              <span className="mode-emoji" aria-hidden="true">📅</span>
              <span className="mode-title">Daily Challenge</span>
              <span className="mode-desc">5 flags — the same for everyone.</span>
              <span className="mode-tag">{todayKey()}</span>
            </button>
          )}
          <button className="mode-card" onClick={() => startMode('endless')}>
            <span className="mode-emoji" aria-hidden="true">♾️</span>
            <span className="mode-title">Endless</span>
            <span className="mode-desc">A fresh round of 5 random flags.</span>
            <span className="mode-tag">Replayable</span>
          </button>
        </div>
      </div>
    )
  }

  // ---------- end of round ----------
  if (done) {
    const avg = scores.length ? scores.reduce((s, r) => s + r.score, 0) / scores.length : 0
    return (
      <div className="app">
        {header}
        <div className="card endscreen">
          <span className="round-label">{mode === 'daily' ? `Daily · ${todayKey()}` : 'Endless round'}</span>
          <h2>Round complete</h2>
          <p className="big">Average {avg.toFixed(2)} <span className="of">/ 10.00</span></p>
          {scores.length > 0 && (
            <ul className="scorelist">
              {scores.map((r, i) => (
                <li key={i}>
                  <span>{r.name}{r.skipped ? ' (skipped)' : ''}</span>
                  <span className={r.skipped ? 'skipped-score' : ''}>{r.score.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          {mode === 'daily' && <p className="hint" style={{ textAlign: 'center' }}>That's your one daily attempt — new flags tomorrow.</p>}
          <div className="actions endscreen-actions">
            <button className="btn ghost" onClick={backToMenu}>Menu</button>
            {mode === 'endless' && <button className="btn" onClick={newEndless}>New round</button>}
          </div>
        </div>
      </div>
    )
  }

  // ---------- playing ----------
  return (
    <div className="app">
      {header}
      <FlagGame
        key={`${mode}-${idx}-${flag.id}`}
        flag={flag}
        roundLabel={`${mode === 'daily' ? 'Daily' : 'Endless'} · Flag ${idx + 1} of ${rounds.length}`}
        isLast={isLast}
        onNext={(score) => advance(score)}
        onSkip={() => advance(null)}
      />
    </div>
  )
}
