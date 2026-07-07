import { useEffect, useRef, useState } from 'react'
import { Liveline } from 'liveline'
import type { LivelinePoint } from 'liveline'
import type { TokenBurnerData } from '../shared/types'

const MAX_POINTS = 120
const IRIS = '#5E3CFF' // var(--iris-500) — Liveline needs a raw hex.

// Re-anchor a snapshot's series so its last sample lands at "now" (1s spacing).
// Keeps the time axis continuous regardless of clock skew between the committed
// snapshot and the wall clock, so re-seeding never leaves a gap in the line.
function anchorSeries(series: TokenBurnerData['series']): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000)
  const n = series.length
  return series.map((p, i) => ({ time: now - (n - 1 - i), value: p.value }))
}

/**
 * The live tokens/sec band. Seeds from the snapshot's `series`, then appends a
 * jittered point every second so the line breathes between 60s refreshes.
 * Styled to the Phoebe system: a thin iris line + faint iris area, mono axes,
 * a pulsing end-dot and an iris current-value pill. `momentum` kept, `degen`
 * dropped (too frenetic for the calm paper theme).
 */
export function BurnChart({ data }: { data: TokenBurnerData }) {
  const [points, setPoints] = useState<LivelinePoint[]>(() =>
    anchorSeries(data.series),
  )
  const [value, setValue] = useState(data.rate.tokensPerSecond)
  const dataRef = useRef(data)
  dataRef.current = data
  const seenRef = useRef(data.updatedAt)

  // Re-seed when a fresh snapshot arrives.
  useEffect(() => {
    if (seenRef.current !== data.updatedAt) {
      seenRef.current = data.updatedAt
      setPoints(anchorSeries(data.series))
    }
  }, [data])

  // Append a bursty live sample each second.
  useEffect(() => {
    const id = setInterval(() => {
      const base = dataRef.current.rate.tokensPerSecond
      const wave = Math.sin(Date.now() / 1700) + Math.sin(Date.now() / 640) * 0.5
      const jitter = base * 0.38 * (wave * 0.6 + (Math.random() - 0.5))
      const v = Math.max(0, base + jitter)
      setValue(v)
      setPoints((prev) => {
        const next = prev.concat({ time: Math.floor(Date.now() / 1000), value: v })
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Liveline
      data={points}
      value={value}
      color={IRIS}
      theme="light"
      fill
      grid
      pulse
      badge
      momentum
      lineWidth={2.5}
      showValue
      formatValue={(v) => `${Math.round(v)} tok/s`}
      formatTime={(t) =>
        new Date(t * 1000).toLocaleTimeString('en-US', { hour12: false })
      }
      style={{ width: '100%', height: '100%' }}
    />
  )
}
