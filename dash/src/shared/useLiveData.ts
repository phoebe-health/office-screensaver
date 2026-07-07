import { useEffect, useRef, useState } from 'react'

/**
 * Fetches a committed JSON feed and re-polls it on an interval so the page
 * picks up new snapshots (committed by the refresh-data cron) without a reload.
 * Cache-busted each poll. Returns the latest snapshot (or null before first load).
 */
export function useLiveData<T>(url: string, pollMs = 60_000): T | null {
  const [data, setData] = useState<T | null>(null)
  const urlRef = useRef(url)
  urlRef.current = url

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch(`${urlRef.current}?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = (await res.json()) as T
        if (alive) setData(json)
      } catch {
        /* keep last good snapshot on transient errors */
      }
    }
    load()
    const id = setInterval(load, pollMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [pollMs])

  return data
}

/**
 * requestAnimationFrame loop helper. Calls `cb(dtSeconds, elapsedSeconds)` each
 * frame. Used to smoothly extrapolate counters between snapshots.
 */
export function useAnimationFrame(cb: (dt: number, elapsed: number) => void) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const start = last
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      cbRef.current(dt, (now - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}
