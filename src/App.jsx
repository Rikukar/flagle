import { useEffect, useState } from 'react'
import { FLAGS } from './flags'
import FlagGame from './FlagGame'
import { pickN, dailyKeyFor, dailyPick } from './daily'

const ROUND_SIZE = 5

const todayKey = () => dailyKeyFor()
const dailyRounds = () => dailyPick(FLAGS, ROUND_SIZE, todayKey())
const endlessRounds = () => pickN(FLAGS, ROUND_SIZE, Math.random)

const dailyStoreKey = () => 'flagle-daily-' + todayKey()
const loadDailyResult = () => {
  try { return JSON.parse(localStorage.getItem(dailyStoreKey())) } catch { return null }
}

// in-progress daily state so you resume where you left off (and can't replay flags)
const dailyProgressKey = () => 'flagle-progress-' + todayKey()
const loadDailyProgress = () => {
  try { return JSON.parse(localStorage.getItem(dailyProgressKey())) } catch { return null }
}
const saveDailyProgress = (idx, scores, pending) => {
  try { localStorage.setItem(dailyProgressKey(), JSON.stringify({ idx, scores, pending })) } catch { /* ignore */ }
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

  const finalizeDaily = (sc) => {
    const avg = sc.length ? sc.reduce((s, r) => s + r.score, 0) / sc.length : 0
    const result = { date: todayKey(), avg, scores: sc }
    try {
      localStorage.setItem(dailyStoreKey(), JSON.stringify(result))
      localStorage.removeItem(dailyProgressKey())
    } catch { /* ignore */ }
    setDailyResult(result)
  }

  const startMode = (m) => {
    if (m === 'endless') {
      setRounds(endlessRounds())
      setIdx(0)
      setScores([])
      setDone(false)
      setMode('endless')
      return
    }
    // daily — resume from saved progress so finished flags can't be replayed
    if (dailyResult) return // already completed today
    const r = dailyRounds()
    let i = 0
    let sc = []
    const prog = loadDailyProgress()
    if (prog) {
      i = prog.idx || 0
      sc = prog.scores || []
      // a flag that was submitted but not advanced is locked in on return
      if (prog.pending != null && r[i]) {
        sc = [...sc, { name: r[i].name, score: prog.pending }]
        i += 1
      }
    }
    setRounds(r)
    setScores(sc)
    setMode('daily')
    if (i >= r.length) { // the round was actually finished
      finalizeDaily(sc)
      setIdx(0)
      setDone(true)
      return
    }
    saveDailyProgress(i, sc, null)
    setIdx(i)
    setDone(false)
  }

  const backToMenu = () => { setMode(null); setDone(false) }

  const flag = rounds[idx]
  const isLast = idx === rounds.length - 1

  // called the moment a daily flag is submitted, so leaving after seeing the
  // score still locks that flag in (no submit-then-leave retry)
  const onScored = (score) => {
    if (mode === 'daily') saveDailyProgress(idx, scores, score)
  }

  const advance = (score) => {
    // a skipped flag counts as 0 points and still shows in the summary
    const entry = score != null ? { name: flag.name, score } : { name: flag.name, score: 0, skipped: true }
    const nextScores = [...scores, entry]
    setScores(nextScores)
    if (isLast) {
      if (mode === 'daily') finalizeDaily(nextScores)
      setDone(true)
    } else {
      const ni = idx + 1
      setIdx(ni)
      if (mode === 'daily') saveDailyProgress(ni, nextScores, null)
    }
  }

  const newEndless = () => {
    setRounds(endlessRounds())
    setIdx(0)
    setScores([])
    setDone(false)
  }

  const navTo = (m) => {
    if (m === mode && !done) return
    if (m === 'daily' && dailyResult) { setMode(null); setDone(false); return }
    startMode(m)
  }

  const header = (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={backToMenu} aria-label="Flagle — home">
          <span className="brand-mark">⚑</span>
          <span className="brand-name">Flagle</span>
        </button>
        <nav className="topnav">
          <button
            className={`nav-tab${mode === 'daily' ? ' active' : ''}`}
            onClick={() => navTo('daily')}
            title={dailyResult ? 'Daily already played today' : 'Daily challenge'}
          >
            📅 <span className="nav-tab-text">Daily</span>
          </button>
          <button
            className={`nav-tab${mode === 'endless' ? ' active' : ''}`}
            onClick={() => navTo('endless')}
          >
            ♾️ <span className="nav-tab-text">Endless</span>
          </button>
        </nav>
        <div className="topbar-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    </header>
  )

  // ---------- menu ----------
  if (!mode) {
    return (
      <>
        {header}
        <main className="app">
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
        </main>
      </>
    )
  }

  // ---------- end of round ----------
  if (done) {
    const avg = scores.length ? scores.reduce((s, r) => s + r.score, 0) / scores.length : 0
    return (
      <>
        {header}
        <main className="app">
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
        </main>
      </>
    )
  }

  // ---------- playing ----------
  return (
    <>
      {header}
      <main className="app">
        <FlagGame
          key={`${mode}-${idx}-${flag.id}`}
          flag={flag}
          mode={mode}
          roundLabel={`${mode === 'daily' ? 'Daily' : 'Endless'} · Flag ${idx + 1} of ${rounds.length}`}
          isLast={isLast}
          onScored={onScored}
          onNext={(score) => advance(score)}
          onSkip={() => advance(null)}
        />
      </main>
    </>
  )
}
