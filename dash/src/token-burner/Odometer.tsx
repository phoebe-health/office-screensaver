import { useMemo, useRef } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { useAnimationFrame } from '../shared/useLiveData'

// 0-9 with a trailing 0 so the reel wraps seamlessly from 9 back to 0
// (both endpoints render the same glyph).
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

/**
 * National-debt-clock odometer. Each digit is a vertical reel whose position is
 * a continuous function of the value, so low digits blur upward while high
 * digits creep — driven imperatively off a ref (no React re-render per frame).
 */
export function Odometer({
  valueRef,
  digitCount,
  className,
}: {
  valueRef: MutableRefObject<number>
  digitCount: number
  className?: string
}) {
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([])

  // place values from most-significant (left) to least (right)
  const places = useMemo(() => {
    const p: number[] = []
    for (let i = digitCount - 1; i >= 0; i--) p.push(Math.pow(10, i))
    return p
  }, [digitCount])

  useAnimationFrame(() => {
    const v = Math.max(0, valueRef.current)
    for (let idx = 0; idx < places.length; idx++) {
      const strip = stripRefs.current[idx]
      if (!strip) continue
      // Cascading-carry odometer: each digit rests crisply on its integer and
      // only rolls to the next during the final slice of the digit below it —
      // the way a mechanical counter ticks, rather than every wheel smearing.
      const raw = v / places[idx]
      const d = Math.floor(raw) % 10
      const frac = raw - Math.floor(raw)
      const t = frac > 0.82 ? (frac - 0.82) / 0.18 : 0
      const roll = t * t * (3 - 2 * t) // smoothstep the flip
      const pos = d + roll // [0,10)
      strip.style.transform = `translateY(${-pos * (100 / STRIP.length)}%)`
    }
  })

  const cells: ReactNode[] = []
  places.forEach((_, idx) => {
    const digitsFromRight = digitCount - 1 - idx
    if (digitsFromRight > 0 && digitsFromRight % 3 === 0) {
      cells.push(
        <span key={`c${idx}`} className="odo-comma">
          ,
        </span>,
      )
    }
    cells.push(
      <span key={idx} className="odo-reel">
        <span className="odo-strip" ref={(el) => (stripRefs.current[idx] = el)}>
          {STRIP.map((d, i) => (
            <span key={i} className="odo-digit">
              {d}
            </span>
          ))}
        </span>
      </span>,
    )
  })

  return <div className={`odometer ${className ?? ''}`}>{cells}</div>
}
