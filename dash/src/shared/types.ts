// Data contract shared by the dashboards and the Logfire refresh script
// (scripts/refresh-data.mjs). Both JSON feeds are aggregate + PII-free so they
// are safe to commit to this public repo.

export interface TokenBurnerData {
  /** ISO timestamp this snapshot was generated. */
  updatedAt: string
  /** Length of the sampling window used to compute `rate`, in seconds. */
  windowSeconds: number
  totals: {
    /** Best-effort cumulative tokens since an epoch baseline (grows over time). */
    tokensAllTime: number
    /** Tokens burned so far during the current UTC day. */
    tokensToday: number
    /** Estimated USD spend so far during the current UTC day. */
    costTodayUsd: number
  }
  rate: {
    /** Current burn rate — drives the live ticking counter. */
    tokensPerSecond: number
    usdPerSecond: number
    inputTokensPerSecond: number
    outputTokensPerSecond: number
  }
  /** Recent tokens/sec samples for the liveline chart. time = unix seconds. */
  series: { time: number; value: number }[]
  /** Per-model split of the current burn. */
  byModel: {
    model: string
    label: string
    tokensPerSecond: number
    share: number // 0..1
  }[]
}

export interface TextCity {
  city: string
  state: string
  lat: number
  lng: number
  /** Relative weight / recent count for this metro. */
  count: number
}

export interface TextEvent {
  /** ISO timestamp (may be synthesized client-side between refreshes). */
  ts: string
  city: string
  state: string
  lat: number
  lng: number
  channel: 'sms' | 'imessage'
  /** Masked, templated line — never contains PII. */
  masked: string
}

export interface TextsData {
  updatedAt: string
  windowSeconds: number
  totals: {
    textsToday: number
    textsAllTime: number
    smsToday: number
    imessageToday: number
  }
  rate: {
    /** Drives the globe pulse + live-feed cadence. */
    textsPerMinute: number
  }
  /** Aggregate volume by metro — drives globe marker density. */
  locations: TextCity[]
  /** Seed of recent masked events; the client extends this stream live. */
  recent: TextEvent[]
}
