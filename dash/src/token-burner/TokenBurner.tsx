import { useRef } from 'react'
import { useLiveData, useAnimationFrame } from '../shared/useLiveData'
import type { TokenBurnerData } from '../shared/types'
import { theme } from '../shared/theme'
import { compact, usd, withCommas } from '../shared/format'
import { Odometer } from './Odometer'
import { BurnChart } from './BurnChart'
import './styles.css'

export function TokenBurner() {
  const data = useLiveData<TokenBurnerData>('./data/token-burner.json')

  // Latest snapshot, read inside the animation frame without re-subscribing.
  const dataRef = useRef<TokenBurnerData | null>(null)
  dataRef.current = data

  // Extrapolated display values, updated imperatively at 60fps.
  const tokRef = useRef(0)
  const costRef = useRef(0)
  const costElRef = useRef<HTMLSpanElement | null>(null)
  const baseRef = useRef<{
    tok: number
    cost: number
    elapsed: number
    updatedAt: string
  } | null>(null)
  const initedRef = useRef(false)

  useAnimationFrame((dt, elapsed) => {
    const d = dataRef.current
    if (!d) return

    // (Re)anchor to each new authoritative snapshot.
    if (!baseRef.current || baseRef.current.updatedAt !== d.updatedAt) {
      baseRef.current = {
        tok: d.totals.tokensAllTime,
        cost: d.totals.costTodayUsd,
        elapsed,
        updatedAt: d.updatedAt,
      }
      if (!initedRef.current) {
        tokRef.current = d.totals.tokensAllTime
        costRef.current = d.totals.costTodayUsd
        initedRef.current = true
      }
    }

    const b = baseRef.current
    const secs = elapsed - b.elapsed
    const tokTarget = b.tok + d.rate.tokensPerSecond * secs
    const costTarget = b.cost + d.rate.usdPerSecond * secs
    const k = Math.min(1, dt * 2.5)

    // Cumulative burn only ever moves forward — ease up toward the target so a
    // fresh snapshot reconciles smoothly and never counts backward.
    if (tokTarget > tokRef.current) tokRef.current += (tokTarget - tokRef.current) * k
    // Today's spend can reset at UTC midnight, so ease in both directions.
    costRef.current += (costTarget - costRef.current) * k

    if (costElRef.current) costElRef.current.textContent = usd(costRef.current)
  })

  if (!data) {
    return (
      <div className="tb tb-loading">
        <div className="ember-bg" />
        <div className="loading-inner">
          <span className="flame">🔥</span>
          <span className="loading-text">igniting the burner…</span>
        </div>
      </div>
    )
  }

  const digitCount = String(Math.floor(data.totals.tokensAllTime)).length
  const tps = data.rate.tokensPerSecond
  const modelColors = [theme.burner, theme.purple]

  return (
    <div className="tb">
      <div className="ember-bg" />
      <div className="scanlines" />

      <header className="tb-header">
        <div className="wordmark">phoebe</div>
        <div className="title">
          TOKEN <span className="title-accent">BURNER</span> <span className="fire">🔥</span>
        </div>
        <div className="live-tag">
          <span className="live-dot" />
          live from production
        </div>
      </header>

      <main className="tb-main">
        <section className="hero">
          <div className="hero-label">total tokens burned · all time</div>
          <Odometer valueRef={tokRef} digitCount={digitCount} className="hero-odo" />
          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">est. spend today</div>
              <div className="stat-value">
                <span ref={costElRef}>{usd(data.totals.costTodayUsd)}</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">tokens today</div>
              <div className="stat-value">{compact(data.totals.tokensToday)}</div>
            </div>
            <div className="stat rate-stat">
              <div className="stat-label">burning right now</div>
              <div className="stat-value">
                <span className="mini-fire">🔥</span> ~{Math.round(tps)}
                <span className="unit"> tok/s</span>
              </div>
              <div className="io-split">
                {Math.round(data.rate.inputTokensPerSecond)} in ·{' '}
                {Math.round(data.rate.outputTokensPerSecond)} out
              </div>
            </div>
          </div>
        </section>

        <section className="chart-band">
          <BurnChart data={data} />
        </section>

        <section className="models">
          {data.byModel.map((m, i) => (
            <div className="model-row" key={m.model}>
              <div className="model-head">
                <span className="model-label">{m.label}</span>
                <span className="model-share" style={{ color: modelColors[i % modelColors.length] }}>
                  {Math.round(m.share * 100)}%
                </span>
              </div>
              <div className="model-bar">
                <div
                  className="model-fill"
                  style={{
                    width: `${Math.max(1.5, m.share * 100)}%`,
                    background: `linear-gradient(90deg, ${modelColors[i % modelColors.length]}44, ${modelColors[i % modelColors.length]})`,
                    boxShadow: `0 0 24px ${modelColors[i % modelColors.length]}88`,
                  }}
                />
              </div>
              <div className="model-rate">{withCommas(m.tokensPerSecond)} tok/s</div>
            </div>
          ))}
        </section>
      </main>

      <footer className="tb-footer">
        <span>for fun · approximate</span>
        <span className="dot-sep">·</span>
        <span>numbers extrapolated between 60s snapshots</span>
      </footer>
    </div>
  )
}
