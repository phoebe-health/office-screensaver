import { useEffect, useRef, useState } from 'react'
import type { TokenBurnerData } from '../shared/types'

interface Order {
  id: number
  text: string
  side: 'in' | 'out'
  left: number // % from left
  bottom: number // px from bottom
  fontSize: number // px
  opacity: number
}

const MAX_ORDERS = 12
const LIFETIME_MS = 2600

/**
 * Orderbook-style spend stream drifting over the chart. Every "buy" of tokens
 * spawns a `+$X` label near the lower-left that rises and fades. Green = input
 * tokens, red = output. Spawn cadence scales with the live burn rate; larger
 * orders render bigger + brighter. Purely decorative — approximate on purpose.
 */
export function SpendStream({ rate }: { rate: TokenBurnerData['rate'] }) {
  const [orders, setOrders] = useState<Order[]>([])
  const rateRef = useRef(rate)
  rateRef.current = rate
  const idRef = useRef(0)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout>

    function fmt(v: number): string {
      return v < 0.01 ? `+$${v.toFixed(4)}` : `+$${v.toFixed(3)}`
    }

    function spawn(side: 'in' | 'out') {
      const r = rateRef.current
      // Each order = a few-to-many seconds' worth of that side's spend, so the
      // micro-cent burn reads as a readable stream of tiny buys.
      const seconds = 3 + Math.random() * (side === 'in' ? 30 : 50)
      const perSecShare =
        r.usdPerSecond *
        (side === 'in'
          ? r.inputTokensPerSecond / r.tokensPerSecond
          : r.outputTokensPerSecond / r.tokensPerSecond)
      const value = Math.max(0.0002, perSecShare * seconds)
      const big = value > 0.006
      const order: Order = {
        id: idRef.current++,
        text: fmt(value),
        side,
        left: 3 + Math.random() * 34,
        bottom: 6 + Math.random() * 26,
        fontSize: big ? 30 + Math.random() * 8 : 20 + Math.random() * 6,
        opacity: big ? 1 : 0.72 + Math.random() * 0.18,
      }
      setOrders((prev) => {
        const next = prev.concat(order)
        return next.length > MAX_ORDERS ? next.slice(next.length - MAX_ORDERS) : next
      })
      setTimeout(() => {
        if (alive) setOrders((prev) => prev.filter((o) => o.id !== order.id))
      }, LIFETIME_MS)
    }

    function schedule() {
      const r = rateRef.current
      // Period shrinks as burn rate rises. Input orders far more frequent than
      // output (matches ~114 in / 6 out split).
      const inputPeriod = Math.max(140, 1500 - r.tokensPerSecond * 7)
      const delay = inputPeriod * (0.6 + Math.random() * 0.8)
      timer = setTimeout(() => {
        if (!alive) return
        spawn('in')
        // Output orders sprinkled in at a fraction of the input cadence.
        if (Math.random() < 0.22) spawn('out')
        schedule()
      }, delay)
    }

    schedule()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="spend-stream">
      {orders.map((o) => (
        <span
          key={o.id}
          className="spend-order"
          style={{
            left: `${o.left}%`,
            bottom: `${o.bottom}%`,
            fontSize: `${o.fontSize}px`,
            color: o.side === 'in' ? 'var(--success)' : 'var(--danger)',
            opacity: o.opacity,
          }}
        >
          {o.text}
        </span>
      ))}
    </div>
  )
}
