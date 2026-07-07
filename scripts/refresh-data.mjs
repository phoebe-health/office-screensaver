#!/usr/bin/env node
// Refreshes the two dashboard feeds from Phoebe production telemetry (Logfire).
//
// Pulls only aggregate, PII-free numbers (token counts, message counts) so the
// output is safe to commit to this public repo. Run on a schedule by
// .github/workflows/refresh-data.yml. Totals accumulate across runs (with a
// UTC-day reset) rather than re-scanning a full day, which keeps queries cheap.
//
// Env: LOGFIRE_READ_TOKEN (a Logfire *read* token for the phoebe-production project).
// Usage: node scripts/refresh-data.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../dash/public/data')
const TOKEN_FILE = resolve(DATA_DIR, 'token-burner.json')
const TEXTS_FILE = resolve(DATA_DIR, 'texts.json')

const TOKEN = process.env.LOGFIRE_READ_TOKEN
const HOST = process.env.LOGFIRE_HOST || 'https://logfire-us.pydantic.dev'
const WINDOW_MIN = 15
const WINDOW_SEC = WINDOW_MIN * 60

// Rough public pricing, USD per 1M tokens. Approximate — for a fun office screen.
const PRICES = {
  'gemini-3.5-flash': { in: 0.3, out: 2.5, label: 'Voice · Gemini 3.5 Flash' },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0, label: 'Memory · Claude Sonnet 4.6' },
  _default: { in: 1.0, out: 5.0, label: 'Other models' },
}
const priceFor = (m) => PRICES[m] || PRICES._default

async function logfire(sql) {
  if (!TOKEN) throw new Error('LOGFIRE_READ_TOKEN is not set')
  const min = new Date(Date.now() - WINDOW_SEC * 1000).toISOString()
  const url = `${HOST}/v1/query?min_timestamp=${encodeURIComponent(min)}&sql=${encodeURIComponent(sql)}`
  // Logfire read tokens work with either bare or Bearer auth depending on age; try both.
  for (const auth of [`Bearer ${TOKEN}`, TOKEN]) {
    const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } })
    if (res.status === 401) continue
    if (!res.ok) throw new Error(`Logfire ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const body = await res.json()
    // v1 returns { columns:[{name,values:[...]}], ... } or { rows:[...] }; normalize to rows.
    if (Array.isArray(body.rows)) return body.rows
    if (Array.isArray(body.columns)) {
      const cols = body.columns
      const n = cols[0]?.values?.length ?? 0
      const rows = []
      for (let i = 0; i < n; i++) {
        const r = {}
        for (const c of cols) r[c.name] = c.values[i]
        rows.push(r)
      }
      return rows
    }
    return []
  }
  throw new Error('Logfire auth failed (401) with and without Bearer prefix')
}

const readJSON = (f, fallback) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'))
  } catch {
    return fallback
  }
}
const sameUtcDay = (aIso, bMs) =>
  new Date(aIso).toISOString().slice(0, 10) === new Date(bMs).toISOString().slice(0, 10)

async function refreshTokens(nowMs, nowIso) {
  const prev = readJSON(TOKEN_FILE, null)
  // Per-model token sums over the window from token-bearing spans.
  const rows = await logfire(`
    SELECT COALESCE(attributes->>'gen_ai.request.model', attributes->>'model', 'unknown') AS model,
      SUM(COALESCE((attributes->>'gen_ai.usage.input_tokens')::bigint,(attributes->>'input_tokens')::bigint,0)) AS in_tok,
      SUM(COALESCE((attributes->>'gen_ai.usage.output_tokens')::bigint,(attributes->>'output_tokens')::bigint,0)) AS out_tok
    FROM records
    WHERE start_timestamp >= now() - interval '${WINDOW_MIN} minutes'
      AND (attributes->>'gen_ai.usage.input_tokens' IS NOT NULL OR attributes->>'input_tokens' IS NOT NULL)
    GROUP BY 1 ORDER BY (in_tok+out_tok) DESC LIMIT 20`)

  let inTok = 0,
    outTok = 0,
    windowCostToday = 0
  const byModelRaw = []
  for (const r of rows) {
    const i = Number(r.in_tok || 0)
    const o = Number(r.out_tok || 0)
    inTok += i
    outTok += o
    const p = priceFor(r.model)
    windowCostToday += (i * p.in + o * p.out) / 1_000_000
    byModelRaw.push({ model: r.model, tokens: i + o })
  }
  const total = inTok + outTok
  const tps = total / WINDOW_SEC
  const inTps = inTok / WINDOW_SEC
  const outTps = outTok / WINDOW_SEC
  const usdPerSec = windowCostToday / WINDOW_SEC

  const byModelTotal = byModelRaw.reduce((s, m) => s + m.tokens, 0) || 1
  const byModel = byModelRaw.map((m) => ({
    model: m.model,
    label: priceFor(m.model).label,
    tokensPerSecond: round(m.tokens / WINDOW_SEC, 1),
    share: round(m.tokens / byModelTotal, 4),
  }))

  // Accumulate day / all-time totals (reset "today" at UTC midnight).
  const resetToday = prev ? !sameUtcDay(prev.updatedAt, nowMs) : false
  const tokensToday = (prev && !resetToday ? prev.totals.tokensToday : 0) + total
  const costToday = (prev && !resetToday ? prev.totals.costTodayUsd : 0) + windowCostToday
  const tokensAllTime = (prev ? prev.totals.tokensAllTime : 8_400_000_000) + total

  // Roll the chart series forward with 1 sample per window.
  const series = (prev?.series || []).slice(-39)
  series.push({ time: Math.floor(nowMs / 1000), value: round(tps, 1) })

  const out = {
    updatedAt: nowIso,
    windowSeconds: WINDOW_SEC,
    totals: {
      tokensAllTime: Math.round(tokensAllTime),
      tokensToday: Math.round(tokensToday),
      costTodayUsd: round(costToday, 2),
    },
    rate: {
      tokensPerSecond: round(tps, 1),
      usdPerSecond: round(usdPerSec, 6),
      inputTokensPerSecond: round(inTps, 1),
      outputTokensPerSecond: round(outTps, 1),
    },
    series,
    byModel: byModel.length ? byModel : prev?.byModel || [],
  }
  writeFileSync(TOKEN_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log(`tokens: ${round(tps, 1)}/s  today=${out.totals.tokensToday}  models=${byModel.length}`)
}

async function refreshTexts(nowMs, nowIso) {
  const prev = readJSON(TEXTS_FILE, null)
  const rows = await logfire(`
    SELECT
      SUM(CASE WHEN span_name = 'process_handler.outbox.sms.process_requested.v1' THEN 1 ELSE 0 END) AS sms,
      SUM(CASE WHEN span_name = 'process_handler.outbox.imessage.process_requested.v1' THEN 1 ELSE 0 END) AS imsg
    FROM records
    WHERE start_timestamp >= now() - interval '${WINDOW_MIN} minutes'
      AND span_name IN ('process_handler.outbox.sms.process_requested.v1','process_handler.outbox.imessage.process_requested.v1')
    LIMIT 1`)
  const sms = Number(rows[0]?.sms || 0)
  const imsg = Number(rows[0]?.imsg || 0)
  const total = sms + imsg
  const tpm = total / WINDOW_MIN

  const resetToday = prev ? !sameUtcDay(prev.updatedAt, nowMs) : false
  const base = prev && !resetToday ? prev.totals : null
  const smsToday = (base?.smsToday || 0) + sms
  const imessageToday = (base?.imessageToday || 0) + imsg
  const textsToday = smsToday + imessageToday
  const textsAllTime = (prev?.totals.textsAllTime || 2_430_000) + total

  // Locations + masked recent lines are stylized (geo isn't available PII-free);
  // carry the committed set forward and refresh the masked feed cadence.
  const locations = prev?.locations || []
  const recent = buildMaskedRecent(locations, nowMs, tpm)

  const out = {
    updatedAt: nowIso,
    windowSeconds: WINDOW_SEC,
    totals: {
      textsToday: Math.round(textsToday),
      textsAllTime: Math.round(textsAllTime),
      smsToday: Math.round(smsToday),
      imessageToday: Math.round(imessageToday),
    },
    rate: { textsPerMinute: round(tpm, 1) },
    locations,
    recent,
  }
  writeFileSync(TEXTS_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log(`texts: ${round(tpm, 1)}/min  today=${textsToday} (sms=${sms} imsg=${imsg} in window)`)
}

const TEMPLATES = [
  'Shift reminder sent to a caregiver in {c}, {s}',
  'Visit confirmation delivered • {c}, {s}',
  'Clock-in nudge sent in {c}, {s}',
  'Open-shift offer texted to {c}, {s}',
  'Schedule update sent • {c}, {s}',
  'Care check-in message • {c}, {s}',
]
function buildMaskedRecent(locations, nowMs, tpm) {
  if (!locations.length) return []
  // Weighted pick of metros by count, newest first.
  const weighted = []
  locations.forEach((l, i) => {
    for (let k = 0; k < Math.max(1, Math.round(l.count / 5)); k++) weighted.push(i)
  })
  const out = []
  const gapSec = tpm > 0 ? 60 / tpm : 8
  for (let n = 0; n < 14; n++) {
    const l = locations[weighted[(n * 7 + 3) % weighted.length]]
    out.push({
      ts: new Date(nowMs - n * gapSec * 1000).toISOString(),
      city: l.city,
      state: l.state,
      lat: l.lat,
      lng: l.lng,
      channel: n % 2 ? 'imessage' : 'sms',
      masked: TEMPLATES[n % TEMPLATES.length].replace('{c}', l.city).replace('{s}', l.state),
    })
  }
  return out
}

function round(n, d) {
  const f = 10 ** d
  return Math.round(n * f) / f
}

async function main() {
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const results = await Promise.allSettled([
    refreshTokens(nowMs, nowIso),
    refreshTexts(nowMs, nowIso),
  ])
  let failed = false
  for (const r of results) {
    if (r.status === 'rejected') {
      failed = true
      console.error('refresh failed:', r.reason?.message || r.reason)
    }
  }
  // Non-fatal: if one feed fails we keep its last-good committed JSON.
  if (failed && results.every((r) => r.status === 'rejected')) process.exit(1)
}

main()
