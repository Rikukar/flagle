import { useMemo, useState } from 'react'
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
  const [solved, setSolved] = useState(0)
  const [done, setDone] = useState(false)

  const flag = rounds[idx]
  const isLast = idx === rounds.length - 1

  const advance = (didSolve) => {
    if (didSolve) setSolved((s) => s + 1)
    if (isLast) setDone(true)
    else setIdx((i) => i + 1)
  }

  const restart = () => {
    setRounds(shuffled(FLAGS))
    setIdx(0)
    setSolved(0)
    setDone(false)
  }

  if (done) {
    return (
      <div className="app">
        <header><h1>Flagle</h1></header>
        <div className="endscreen">
          <h2>Round complete</h2>
          <p className="big">{solved} / {rounds.length} solved</p>
          <button className="btn" onClick={restart}>Play again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Flagle</h1>
        <p className="tagline">Build the flag from its pieces — you only get the country's name.</p>
      </header>
      <FlagGame
        key={flag.id}
        flag={flag}
        roundLabel={`Flag ${idx + 1} of ${rounds.length} · solved ${solved}`}
        isLast={isLast}
        onNext={() => advance(true)}
        onSkip={() => advance(false)}
      />
    </div>
  )
}
