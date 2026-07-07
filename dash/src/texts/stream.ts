// Client-side synthesis of the live text stream. The committed feed refreshes
// only every ~60s, so between snapshots we keep the stream flowing by
// weighted-sampling the real metro list and rotating masked templates.
//
// PRIVACY: every line is aggregate / templated. Never introduce names, phone
// numbers, or message bodies here.

import { useEffect, useRef, useState } from 'react'
import type { TextCity, TextEvent, TextsData } from '../shared/types'

/** Masked, PII-free line templates. `{c}` = "City, ST". */
const TEMPLATES = [
  'Shift reminder sent to a caregiver in {c}',
  'Visit confirmation delivered • {c}',
  'Clock-in nudge sent in {c}',
  'Open-shift offer texted to {c}',
  'Schedule update sent • {c}',
  'Care check-in message • {c}',
  'Appointment reminder sent • {c}',
  'Timesheet nudge delivered to {c}',
  'Availability check texted to {c}',
  'Welcome message sent • {c}',
]

let idSeq = 0
export function nextId(): number {
  return ++idSeq
}

export interface FeedRow extends TextEvent {
  id: number
}

/** Weighted pick of a metro by its relative `count`. */
function pickCity(locations: TextCity[]): TextCity {
  const total = locations.reduce((s, l) => s + l.count, 0)
  let r = Math.random() * total
  for (const l of locations) {
    r -= l.count
    if (r <= 0) return l
  }
  return locations[0]
}

/** Build one synthetic, masked event for a weighted-random metro. */
export function synthEvent(locations: TextCity[]): FeedRow {
  const city = pickCity(locations)
  const tmpl = TEMPLATES[(Math.random() * TEMPLATES.length) | 0]
  const label = `${city.city}, ${city.state}`
  return {
    id: nextId(),
    ts: new Date().toISOString(),
    city: city.city,
    state: city.state,
    lat: city.lat,
    lng: city.lng,
    channel: Math.random() < 0.5 ? 'sms' : 'imessage',
    masked: tmpl.replace('{c}', label),
  }
}

const MAX_ROWS = 14

/**
 * Live feed hook. Seeds from `data.recent`, then appends a fresh synthetic row
 * on the real cadence (textsPerMinute). Returns the bounded, newest-first list.
 */
export function useTextStream(data: TextsData | null): FeedRow[] {
  const [rows, setRows] = useState<FeedRow[]>([])
  const dataRef = useRef(data)
  dataRef.current = data
  const seeded = useRef(false)

  // Seed once from the first authoritative snapshot.
  useEffect(() => {
    if (!data || seeded.current) return
    seeded.current = true
    setRows(data.recent.slice(0, MAX_ROWS).map((e) => ({ ...e, id: nextId() })))
  }, [data])

  // Emit synthetic rows at the live cadence, with a little human jitter.
  useEffect(() => {
    let timer: number
    const schedule = () => {
      const tpm = dataRef.current?.rate.textsPerMinute ?? 8
      const base = (60 / Math.max(1, tpm)) * 1000
      const jittered = base * (0.6 + Math.random() * 0.8)
      timer = window.setTimeout(() => {
        const locs = dataRef.current?.locations
        if (locs && locs.length) {
          setRows((prev) => [synthEvent(locs), ...prev].slice(0, MAX_ROWS))
        }
        schedule()
      }, jittered)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return rows
}

/** "3s ago" / "2m ago" relative time from an ISO timestamp. */
export function ago(ts: string, now: number): string {
  const s = Math.max(0, (now - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
