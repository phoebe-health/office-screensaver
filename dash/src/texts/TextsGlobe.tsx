import { useEffect, useMemo, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { useLiveData } from '../shared/useLiveData'
import type { TextsData } from '../shared/types'
import { withCommas } from '../shared/format'
import { Globe, type ArcSpec } from './Globe'
import { LiveFeed } from './LiveFeed'
import { useTextStream, type FeedRow } from './stream'
import './texts.css'

const SANS = 'var(--font-sans)'
const MONO = 'var(--font-mono)'

// ---- Phoebe flower mark (the real brand asset) -------------------------------
function FlowerMark() {
  return (
    <img
      src="./flower-mark.svg"
      width={38}
      height={38}
      alt=""
      style={{ borderRadius: 10, flexShrink: 0, display: 'block' }}
    />
  )
}

// ---- Big ticking counter — NumberFlow, extrapolated between snapshots --------
function TodayCounter({ data }: { data: TextsData }) {
  const [value, setValue] = useState(data.totals.textsToday)
  const anchor = useRef({ count: data.totals.textsToday, t: performance.now(), perSec: 0 })

  useEffect(() => {
    anchor.current = {
      count: data.totals.textsToday,
      t: performance.now(),
      perSec: data.rate.textsPerMinute / 60,
    }
  }, [data])

  // Push a rounded, extrapolated value on a ~120ms throttle; NumberFlow animates
  // the digit transitions smoothly (no 60fps churn needed).
  useEffect(() => {
    const id = setInterval(() => {
      const a = anchor.current
      const next = Math.round(a.count + ((performance.now() - a.t) / 1000) * a.perSec)
      setValue((prev) => (prev === next ? prev : next))
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <NumberFlow
      value={value}
      className="lt-counter"
      trend={1}
      spinTiming={{ duration: 480, easing: 'linear' }}
      transformTiming={{ duration: 480, easing: 'linear' }}
      style={{
        fontFamily: MONO,
        fontSize: 'clamp(52px, 7vw, 148px)',
        fontWeight: 600,
        lineHeight: 0.95,
        color: 'var(--ink-900)',
        letterSpacing: '-0.03em',
      }}
    />
  )
}

// ---- SMS vs iMessage split bar ----------------------------------------------
function SplitBar({ sms, imsg }: { sms: number; imsg: number }) {
  const total = Math.max(1, sms + imsg)
  const smsPct = Math.round((sms / total) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: 1 }}>
      <div
        style={{
          display: 'flex',
          height: 'clamp(8px, 0.8vh, 12px)',
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--ink-100)',
        }}
      >
        <div style={{ width: `${smsPct}%`, background: 'var(--sky)' }} />
        <div style={{ flex: 1, background: 'var(--meadow-700)' }} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: MONO,
          fontSize: 'clamp(12px, 0.78vw, 16px)',
          fontWeight: 500,
        }}
      >
        <span style={{ color: 'var(--sky)' }}>SMS {smsPct}%</span>
        <span style={{ color: 'var(--meadow-700)' }}>iMessage {100 - smsPct}%</span>
      </div>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 'clamp(12px, 0.82vw, 18px)',
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: 'var(--ink-400)',
      }}
    >
      {children}
    </div>
  )
}

const PAGE_BG = 'linear-gradient(180deg, #FFFFFF 0%, #FBF6EF 100%)'

function Loading() {
  return (
    <div
      className="lt-root"
      style={{
        background: PAGE_BG,
        color: 'var(--ink-400)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: MONO,
        fontSize: 'clamp(15px, 1.3vw, 24px)',
        letterSpacing: '0.06em',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          className="lt-livedot"
          style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--iris-500)' }}
        />
        connecting to the live feed…
      </div>
    </div>
  )
}

export function TextsGlobe() {
  const data = useLiveData<TextsData>('./data/texts.json')
  const rows = useTextStream(data)

  // 1s tick drives relative "Ns ago" labels.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Debounced arc set (last few sends) so the globe recreation stays smooth.
  const [arcRows, setArcRows] = useState<FeedRow[]>([])
  useEffect(() => {
    const t = setTimeout(() => setArcRows(rows.slice(0, 7)), 1200)
    return () => clearTimeout(t)
  }, [rows])
  const arcs = useMemo<ArcSpec[]>(
    () => arcRows.map((r) => ({ lat: r.lat, lng: r.lng, channel: r.channel })),
    [arcRows],
  )

  const locations = data?.locations ?? []

  if (!data) return <Loading />

  return (
    <div
      className="lt-root"
      style={{
        background: PAGE_BG,
        color: 'var(--ink-900)',
        fontFamily: SANS,
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(20px, 2.6vh, 44px) clamp(24px, 2.8vw, 60px)',
        gap: 'clamp(12px, 1.8vh, 28px)',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 0.9vw, 16px)' }}>
          <FlowerMark />
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 'clamp(22px, 1.8vw, 36px)',
              letterSpacing: '-0.01em',
              color: 'var(--ink-900)',
            }}
          >
            phoebe
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 'clamp(13px, 0.95vw, 20px)',
            letterSpacing: '0.28em',
            color: 'var(--ink-400)',
          }}
        >
          <span
            className="lt-livedot"
            style={{
              width: 'clamp(9px, 0.62vw, 12px)',
              height: 'clamp(9px, 0.62vw, 12px)',
              borderRadius: '50%',
              background: 'var(--iris-500)',
            }}
          />
          LIVE
        </div>
      </header>

      {/* Main */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 'clamp(20px, 2.4vw, 52px)',
          alignItems: 'stretch',
        }}
      >
        {/* Left — dotted globe */}
        <div style={{ flex: '1.3 1 0', minWidth: 0, position: 'relative' }}>
          <Globe locations={locations} arcs={arcs} />
        </div>

        {/* Right — counters + feed */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(14px, 1.9vh, 30px)',
          }}
        >
          <div>
            <Eyebrow>Texts sent today</Eyebrow>
            <div style={{ marginTop: 'clamp(6px, 0.9vh, 14px)' }}>
              <TodayCounter data={data} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(16px, 1.6vw, 32px)',
                marginTop: 'clamp(12px, 1.4vh, 22px)',
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontWeight: 500,
                  fontSize: 'clamp(16px, 1.2vw, 26px)',
                  color: 'var(--iris-500)',
                  whiteSpace: 'nowrap',
                }}
              >
                ~{data.rate.textsPerMinute.toFixed(1)} / min
              </span>
              <SplitBar sms={data.totals.smsToday} imsg={data.totals.imessageToday} />
            </div>
          </div>

          <LiveFeed rows={rows} now={now} />
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: MONO,
          fontSize: 'clamp(12px, 0.76vw, 16px)',
          letterSpacing: '0.02em',
          color: 'var(--ink-400)',
        }}
      >
        <span>for fun · approximate · no PII</span>
        <span>{withCommas(data.totals.textsAllTime)} sent all time</span>
      </footer>
    </div>
  )
}
