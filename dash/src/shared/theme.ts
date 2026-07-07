// Phoebe office-TV theme. Dark, high-contrast, vibrant accents pulled from the
// existing bouncing-logo screensaver so the dashboards read as the same family.
export const theme = {
  bg: '#050507',
  bgPanel: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.32)',
  // Brand accent palette (from the screensaver color cycle)
  pink: '#ff8ae2',
  purple: '#b388ff',
  cyan: '#4cc9f0',
  green: '#06d6a0',
  yellow: '#ffd166',
  red: '#ff5f6d',
  // Primary accent for each dashboard
  burner: '#ff8ae2', // token burner: hot pink
  texts: '#4cc9f0', // texts globe: cyan
} as const

// cobe wants colors as [r,g,b] in 0..1
export function rgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

export const FONT_STACK =
  "'DM Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const MONO_STACK =
  "'DM Mono', ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, monospace"
