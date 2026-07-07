import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveData, useAnimationFrame } from '../shared/useLiveData'
import type { TextsData } from '../shared/types'
import { theme, FONT_STACK, MONO_STACK } from '../shared/theme'
import { withCommas } from '../shared/format'
import { Globe, type ArcSpec } from './Globe'
import { LiveFeed } from './LiveFeed'
import { useTextStream, type FeedRow } from './stream'
import './texts.css'

// ---- Big ticking counter (extrapolated between snapshots) --------------------
function TodayCounter({ data }: { data: TextsData }) {
  const [display, setDisplay] = useState(data.totals.textsToday)
  const anchor = useRef({ count: 0, t: 0, perSec: 0 })
  const shown = useRef(0)
  const primed = useRef(false)

  useEffect(() => {
    anchor.current = {
      count: data.totals.textsToday,
      t: performance.now(),
      perSec: data.rate.textsPerMinute / 60,
    }
    if (!primed.current) {
      shown.current = data.totals.textsToday
      primed.current = true
    }
  }, [data])

  useAnimationFrame(() => {
    const a = anchor.current
    if (!a.t) return
    const target = a.count + ((performance.now() - a.t) / 1000) * a.perSec
    // Ease toward the authoritative target so new snapshots never visibly reset.
    shown.current += (target - shown.current) * 0.1
    const next = Math.round(shown.current)
    setDisplay((prev) => (prev === next ? prev : next))
  })

  return (
    <div
      style={{
        fontFamily: MONO_STACK,
        fontSize: 'clamp(46px, 6.4vw, 132px)',
        fontWeight: 500,
        lineHeight: 0.98,
        color: theme.text,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 40px ${theme.cyan}55`,
      }}
    >
      {withCommas(display)}
    </div>
  )
}

// ---- SMS vs iMessage split bar ----------------------------------------------
function SplitBar({ sms, imsg }: { sms: number; imsg: number }) {
  const total = Math.max(1, sms + imsg)
  const smsPct = Math.round((sms / total) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
      <div
        style={{
          display: 'flex',
          height: 'clamp(6px, 0.7vh, 10px)',
          borderRadius: 999,
          overflow: 'hidden',
          background: theme.border,
        }}
      >
        <div style={{ width: `${smsPct}%`, background: theme.cyan }} />
        <div style={{ flex: 1, background: theme.green }} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: MONO_STACK,
          fontSize: 'clamp(10px, 0.66vw, 14px)',
          color: theme.textDim,
        }}
      >
        <span style={{ color: theme.cyan }}>SMS {smsPct}%</span>
        <span style={{ color: theme.green }}>iMessage {100 - smsPct}%</span>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div
      className="lt-root"
      style={{
        background: theme.bg,
        color: theme.textDim,
        display: 'grid',
        placeItems: 'center',
        fontFamily: MONO_STACK,
        fontSize: 'clamp(14px, 1.4vw, 24px)',
        letterSpacing: '0.1em',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          className="lt-livedot"
          style={{ width: 12, height: 12, borderRadius: '50%', background: theme.cyan }}
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
        background: `radial-gradient(1200px 800px at 28% 42%, #0a1420 0%, ${theme.bg} 60%)`,
        color: theme.text,
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(16px, 2.2vh, 40px) clamp(20px, 2.4vw, 56px)',
        gap: 'clamp(10px, 1.6vh, 26px)',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(12px, 1.2vw, 26px)' }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 'clamp(20px, 1.7vw, 34px)',
              letterSpacing: '-0.02em',
              color: theme.text,
            }}
          >
            phoebe
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 'clamp(15px, 1.25vw, 26px)',
              letterSpacing: '0.34em',
              color: theme.cyan,
            }}
          >
            LIVE TEXTS
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: MONO_STACK,
            fontSize: 'clamp(11px, 0.85vw, 18px)',
            letterSpacing: '0.14em',
            color: theme.textDim,
          }}
        >
          <span
            className="lt-livedot"
            style={{
              width: 'clamp(8px, 0.6vw, 12px)',
              height: 'clamp(8px, 0.6vw, 12px)',
              borderRadius: '50%',
              background: theme.red,
              boxShadow: `0 0 12px ${theme.red}`,
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
          gap: 'clamp(16px, 2vw, 44px)',
          alignItems: 'stretch',
        }}
      >
        {/* Left — globe */}
        <div style={{ flex: '1.32 1 0', minWidth: 0, position: 'relative' }}>
          <div className="lt-stars" />
          <Globe locations={locations} arcs={arcs} />
        </div>

        {/* Right — counters + feed */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.6vh, 26px)' }}>
          <div>
            <div
              style={{
                fontFamily: MONO_STACK,
                fontSize: 'clamp(11px, 0.8vw, 17px)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: theme.textDim,
                marginBottom: 4,
              }}
            >
              Texts sent today
            </div>
            <TodayCounter data={data} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(14px, 1.4vw, 28px)',
                marginTop: 'clamp(10px, 1.2vh, 18px)',
              }}
            >
              <span
                style={{
                  fontFamily: MONO_STACK,
                  fontSize: 'clamp(14px, 1.15vw, 24px)',
                  color: theme.cyan,
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
          fontFamily: MONO_STACK,
          fontSize: 'clamp(10px, 0.72vw, 15px)',
          letterSpacing: '0.08em',
          color: theme.textFaint,
        }}
      >
        <span>for fun · approximate · no PII</span>
        <span>{withCommas(data.totals.textsAllTime)} sent all time</span>
      </footer>
    </div>
  )
}
