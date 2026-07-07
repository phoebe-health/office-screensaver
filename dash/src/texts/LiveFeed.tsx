import { ago, type FeedRow } from './stream'

interface LiveFeedProps {
  rows: FeedRow[]
  now: number
}

const MONO = 'var(--font-mono)'

function ChannelBadge({ channel }: { channel: 'sms' | 'imessage' }) {
  const sms = channel === 'sms'
  const accent = sms ? 'var(--sky)' : 'var(--meadow-700)'
  const wash = sms ? 'var(--sky-050)' : 'var(--meadow-050)'
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 'clamp(10px, 0.66vw, 14px)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: accent,
        background: wash,
        borderRadius: 7,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        flexShrink: 0,
      }}
    >
      {sms ? 'SMS' : 'iMessage'}
    </span>
  )
}

export function LiveFeed({ rows, now }: LiveFeedProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 0.9vh, 14px)',
        overflow: 'hidden',
        flex: 1,
        maskImage: 'linear-gradient(to bottom, #000 86%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 86%, transparent 100%)',
      }}
    >
      {rows.map((r) => {
        const accent = r.channel === 'sms' ? 'var(--sky)' : 'var(--meadow-700)'
        return (
          <div
            key={r.id}
            className="lt-row-enter"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(10px, 1vw, 18px)',
              background: 'var(--snow)',
              border: '1px solid var(--ink-100)',
              borderLeft: `3px solid ${accent}`,
              borderRadius: 16,
              padding: 'clamp(11px, 1.2vh, 18px) clamp(14px, 1.1vw, 22px)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <ChannelBadge channel={r.channel} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: 'var(--ink-900)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(15px, 1.05vw, 22px)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.25,
                }}
              >
                {r.masked}
              </div>
              <div
                style={{
                  color: 'var(--ink-400)',
                  fontFamily: MONO,
                  fontSize: 'clamp(11px, 0.72vw, 15px)',
                  marginTop: 3,
                }}
              >
                {r.city}, {r.state}
              </div>
            </div>
            <div
              style={{
                color: 'var(--ink-300)',
                fontFamily: MONO,
                fontSize: 'clamp(11px, 0.72vw, 15px)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {ago(r.ts, now)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
