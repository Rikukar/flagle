import { useState } from 'react'
import { FLAGS } from './flags'
import FlagGame from './FlagGame'

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function App() {
  const [rounds, setRounds] = useState(() => shuffled(FLAGS))
  const [idx, setIdx] = useState(0)
  const [scores, setScores] = useState([]) // { name, score } per submitted flag
  const [done, setDone] = useState(false)

  const flag = rounds[idx]
  const isLast = idx === rounds.length - 1

  const advance = (score) => {
    if (score != null) setScores((s) => [...s, { name: flag.name, score }])
    if (isLast) setDone(true)
    else setIdx((i) => i + 1)
  }

  const restart = () => {
    setRounds(shuffled(FLAGS))
    setIdx(0)
    setScores([])
    setDone(false)
  }

  if (done) {
    const avg = scores.length ? scores.reduce((s, r) => s + r.score, 0) / scores.length : 0
    return (
      <div className="app">
        <header><h1>Flagle</h1></header>
        <div className="endscreen">
          <h2>Round complete</h2>
          <p className="big">Average {avg.toFixed(2)} / 10.00</p>
          {scores.length > 0 && (
            <ul className="scorelist">
              {scores.map((r, i) => (
                <li key={i}><span>{r.name}</span><span>{r.score.toFixed(2)}</span></li>
              ))}
            </ul>
          )}
          <button className="btn" onClick={restart}>Play again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Flagle</h1>
        <p className="tagline">Build the flag from its pieces — you only get the country's name. Place each piece as accurately as you can; you're scored on how close you get.</p>
      </header>
      <FlagGame
        key={flag.id}
        flag={flag}
        roundLabel={`Flag ${idx + 1} of ${rounds.length}`}
        isLast={isLast}
        onNext={(score) => advance(score)}
        onSkip={() => advance(null)}
      />
    </div>
  )
}
