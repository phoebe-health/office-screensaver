import { useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { useLiveData, useAnimationFrame } from '../shared/useLiveData'
import type { TokenBurnerData } from '../shared/types'
import { compact, usd } from '../shared/format'
import { BurnChart } from './BurnChart'
import { SpendStream } from './SpendStream'
import './styles.css'

// Model bar palette: iris (signature) → ember (heat) → sky.
const MODEL_COLORS = ['var(--iris-500)', 'var(--ember-500)', 'var(--sky-500)']

export function TokenBurner() {
  const data = useLiveData<TokenBurnerData>('./data/token-burner.json')

  // Latest snapshot, read inside the animation frame without re-subscribing.
  const dataRef = useRef<TokenBurnerData | null>(null)
  dataRef.current = data

  // Extrapolated display values, updated imperatively at 60fps.
  const tokRef = useRef(0)
  const todayRef = useRef(0)
  const costRef = useRef(0)
  const costElRef = useRef<HTMLSpanElement | null>(null)
  const baseRef = useRef<{
    tok: number
    today: number
    cost: number
    elapsed: number
    updatedAt: string
  } | null>(null)
  const initedRef = useRef(false)

  // Rounded values pushed to React on a throttle so NumberFlow animates smooth
  // digit rolls (never set state at 60fps).
  const [displayTok, setDisplayTok] = useState(0)
  const [displayToday, setDisplayToday] = useState(0)
  const lastPushRef = useRef(0)
  const lastCostStrRef = useRef('')

  useAnimationFrame((dt, elapsed) => {
    const d = dataRef.current
    if (!d) return

    // (Re)anchor to each new authoritative snapshot.
    if (!baseRef.current || baseRef.current.updatedAt !== d.updatedAt) {
      baseRef.current = {
        tok: d.totals.tokensAllTime,
        today: d.totals.tokensToday,
        cost: d.totals.costTodayUsd,
        elapsed,
        updatedAt: d.updatedAt,
      }
      if (!initedRef.current) {
        tokRef.current = d.totals.tokensAllTime
        todayRef.current = d.totals.tokensToday
        costRef.current = d.totals.costTodayUsd
        initedRef.current = true
      }
    }

    const b = baseRef.current
    const secs = elapsed - b.elapsed
    const tokTarget = b.tok + d.rate.tokensPerSecond * secs
    const todayTarget = b.today + d.rate.tokensPerSecond * secs
    const costTarget = b.cost + d.rate.usdPerSecond * secs
    const k = Math.min(1, dt * 2.5)

    // Cumulative burn only ever moves forward — ease up toward the target so a
    // fresh snapshot reconciles smoothly and never counts backward.
    if (tokTarget > tokRef.current) tokRef.current += (tokTarget - tokRef.current) * k
    if (todayTarget > todayRef.current)
      todayRef.current += (todayTarget - todayRef.current) * k
    // Today's spend can reset at UTC midnight, so ease in both directions.
    costRef.current += (costTarget - costRef.current) * k

    // The $ figure barely moves (2 decimals), so only touch the DOM when the
    // rendered string actually changes rather than every frame.
    if (costElRef.current) {
      const s = usd(costRef.current)
      if (s !== lastCostStrRef.current) {
        lastCostStrRef.current = s
        costElRef.current.textContent = s
      }
    }

    // Push the NumberFlow value on a cadence that matches its roll duration
    // (~500ms) so each digit roll completes instead of being interrupted every
    // frame — interrupted rolls are what read as "glitchy/blurry" on TV players.
    const nowMs = performance.now()
    if (nowMs - lastPushRef.current > 500) {
      lastPushRef.current = nowMs
      setDisplayTok(Math.floor(tokRef.current))
      setDisplayToday(Math.floor(todayRef.current))
    }
  })

  if (!data) {
    return (
      <div className="tb tb-loading">
        <div className="loading-inner">
          <img
            src="./flower-mark.svg"
            width={64}
            height={64}
            className="loading-mark"
            alt=""
          />
          <span className="loading-text">warming up the burner</span>
        </div>
      </div>
    )
  }

  const tps = data.rate.tokensPerSecond

  return (
    <div className="tb">
      <header className="tb-header">
        <div className="brand">
          <img
            src="./flower-mark.svg"
            width={38}
            height={38}
            className="brand-mark"
            alt=""
          />
          <span className="wordmark">phoebe</span>
        </div>
        <div className="live-tag">
          <span className="live-dot" />
          live
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow hero-eyebrow">Total tokens burned · all time</div>
        <NumberFlow
          value={displayTok}
          className="hero-number"
          format={{ useGrouping: true }}
          trend={1}
          spinTiming={{ duration: 480, easing: 'linear' }}
          transformTiming={{ duration: 480, easing: 'linear' }}
          opacityTiming={{ duration: 180, easing: 'ease-out' }}
        />
      </section>

      <section className="stat-row">
        <div className="stat">
          <div className="stat-label">Est. spend today</div>
          <div className="stat-value">
            <span ref={costElRef}>{usd(data.totals.costTodayUsd)}</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Tokens today</div>
          <div className="stat-value">{compact(displayToday || data.totals.tokensToday)}</div>
        </div>
        <div className="stat rate-stat">
          <div className="stat-label">Burning right now</div>
          <div className="stat-value">
            <span className="rate-flame">🔥</span>
            {Math.round(tps)}
            <span className="stat-unit">tok/s</span>
          </div>
          <div className="io-split">
            <span className="io-in">{Math.round(data.rate.inputTokensPerSecond)} in</span>
            {' · '}
            <span className="io-out">{Math.round(data.rate.outputTokensPerSecond)} out</span>
          </div>
        </div>
      </section>

      <section className="chart-band">
        <div className="chart-inner">
          <BurnChart data={data} />
        </div>
        <SpendStream rate={data.rate} />
      </section>

      <section className="models">
        {data.byModel.map((m, i) => {
          const c = MODEL_COLORS[i % MODEL_COLORS.length]
          return (
            <div className="model-row" key={m.model}>
              <div className="model-head">
                <span className="model-label">{m.label}</span>
                <span className="model-share" style={{ color: c }}>
                  {Math.round(m.share * 100)}%
                </span>
              </div>
              <div className="model-bar">
                <div
                  className="model-fill"
                  style={{ width: `${Math.max(1.5, m.share * 100)}%`, background: c }}
                />
              </div>
              <div className="model-rate">{Math.round(m.tokensPerSecond)} tok/s</div>
            </div>
          )
        })}
      </section>

      <footer className="tb-footer">
        <span>for fun · approximate</span>
        <span className="dot-sep">·</span>
        <span>numbers extrapolated between 60s snapshots</span>
      </footer>
    </div>
  )
}
