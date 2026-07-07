import { theme, MONO_STACK } from '../shared/theme'
import { ago, type FeedRow } from './stream'

interface LiveFeedProps {
  rows: FeedRow[]
  now: number
}

function ChannelChip({ channel }: { channel: 'sms' | 'imessage' }) {
  const sms = channel === 'sms'
  const accent = sms ? theme.cyan : theme.green
  return (
    <span
      style={{
        fontFamily: MONO_STACK,
        fontSize: 'clamp(9px, 0.62vw, 13px)',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: accent,
        background: `${accent}1f`,
        border: `1px solid ${accent}55`,
        borderRadius: 6,
        padding: '2px 7px',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
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
        gap: 'clamp(6px, 0.7vh, 12px)',
        overflow: 'hidden',
        flex: 1,
        maskImage: 'linear-gradient(to bottom, #000 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 88%, transparent 100%)',
      }}
    >
      {rows.map((r) => (
        <div
          key={r.id}
          className="lt-row-enter"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(8px, 0.8vw, 16px)',
            background: theme.bgPanel,
            border: `1px solid ${theme.border}`,
            borderLeft: `2px solid ${r.channel === 'sms' ? theme.cyan : theme.green}`,
            borderRadius: 10,
            padding: 'clamp(8px, 1vh, 14px) clamp(10px, 0.9vw, 18px)',
          }}
        >
          <ChannelChip channel={r.channel} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: theme.text,
                fontSize: 'clamp(13px, 1vw, 20px)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.masked}
            </div>
            <div
              style={{
                color: theme.textFaint,
                fontFamily: MONO_STACK,
                fontSize: 'clamp(10px, 0.66vw, 14px)',
                marginTop: 2,
              }}
            >
              {r.city} · {r.state}
            </div>
          </div>
          <div
            style={{
              color: theme.textDim,
              fontFamily: MONO_STACK,
              fontSize: 'clamp(10px, 0.66vw, 14px)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {ago(r.ts, now)}
          </div>
        </div>
      ))}
    </div>
  )
}
