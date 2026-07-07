import { useEffect, useRef, useState } from 'react'
import { Liveline } from 'liveline'
import type { LivelinePoint } from 'liveline'
import { theme } from '../shared/theme'
import type { TokenBurnerData } from '../shared/types'

const MAX_POINTS = 120

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
 * `degen` + `momentum` make bursts pop with particles and directional glow.
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
      color={theme.burner}
      theme="dark"
      fill
      grid
      pulse
      momentum
      degen={{ scale: 1.4 }}
      lineWidth={3}
      showValue
      formatValue={(v) => `${Math.round(v)} tok/s`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
