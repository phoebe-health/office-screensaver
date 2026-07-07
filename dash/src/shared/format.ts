// Number formatting helpers for the big office-screen readouts.

const COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})
const FULL = new Intl.NumberFormat('en-US')

/** 1_234_567 -> "1.23M" */
export function compact(n: number): string {
  return COMPACT.format(Math.max(0, n))
}

/** 1234567 -> "1,234,567" */
export function withCommas(n: number): string {
  return FULL.format(Math.max(0, Math.round(n)))
}

/** USD with cents, comma-grouped. */
export function usd(n: number, cents = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Math.max(0, n))
}

/** Split an integer into individual digit strings for odometer-style displays. */
export function digits(n: number): string[] {
  return withCommas(n).split('')
}
