import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import type { TextCity } from '../shared/types'
import { rgb01 } from '../shared/theme'

// Phoebe "hub" for the live arcs — SF HQ. Arcs fire hub -> event city.
const HUB: [number, number] = [37.77, -122.42]
// US-forward framing: face North America, gentle tilt.
const START_PHI = 4.9
const THETA = 0.32
// Rotation as angular velocity (rad/sec) so speed stays constant regardless of
// frame rate; the globe also draws at a capped FPS to stay smooth on low-power
// players (Apple TV / KitCast) instead of fighting for 60fps and stuttering.
const ROT_PER_SEC = 0.108
const DRAW_FPS = 30

// Phoebe paper palette (cobe wants raw [r,g,b] 0..1).
const SKY = rgb01('#71cff0') // SMS — marker + sms arcs
const IRIS = rgb01('#5b5bd6') // signature — imessage arcs, kept subtle
const DOT = rgb01('#3a4f60') // softened ink for the landmass dot grid
const GLOW = rgb01('#faf4ec') // near-paper edge glow

export interface ArcSpec {
  lat: number
  lng: number
  channel: 'sms' | 'imessage'
}

interface GlobeProps {
  locations: TextCity[]
  /** Rolling set of recent events drawn as arcs; updated live each frame. */
  arcs: ArcSpec[]
}

function markerSize(count: number, min: number, max: number): number {
  if (max === min) return 0.05
  return 0.024 + ((count - min) / (max - min)) * 0.06
}

/**
 * cobe globe (v2). This build has no internal animation loop and no `onRender`
 * — you call `globe.update()` every frame yourself, and it draws immediately.
 * markers/arcs CAN be updated live via `update()`, so per-metro markers and the
 * rolling arc set are held in refs and pushed each frame — no destroy/recreate.
 * Rotation (phi) is preserved across renders and nudged by drag-to-spin.
 */
export function Globe({ locations, arcs }: GlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(START_PHI)
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartPhiRef = useRef(0)
  const sizeRef = useRef(600)

  // Live-updated draw inputs (read inside the rAF loop without re-creating the globe).
  const markersRef = useRef<{ location: [number, number]; size: number }[]>([])
  const arcsRef = useRef<{ from: [number, number]; to: [number, number]; color: [number, number, number] }[]>([])

  // Recompute per-metro markers whenever the location set changes.
  useEffect(() => {
    if (!locations.length) {
      markersRef.current = []
      return
    }
    const counts = locations.map((l) => l.count)
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    markersRef.current = locations.map((l) => ({
      location: [l.lat, l.lng] as [number, number],
      size: markerSize(l.count, min, max),
    }))
  }, [locations])

  // Recompute the rolling arc set live (no globe recreation needed).
  useEffect(() => {
    arcsRef.current = arcs.map((a) => ({
      from: HUB,
      to: [a.lat, a.lng] as [number, number],
      color: a.channel === 'imessage' ? IRIS : SKY,
    }))
  }, [arcs])

  // Track container size (drives DPR-correct canvas resolution).
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      sizeRef.current = Math.max(1, Math.min(wrap.clientWidth, wrap.clientHeight))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    measure()
    return () => ro.disconnect()
  }, [])

  // Create the globe once and drive it with our own rAF loop.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Cap DPR: at 2x on a 4K screen the globe redraws 4x the pixels every frame,
    // which overwhelms weak players. 1.5 stays crisp while halving that load.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let raf = 0
    let lastT = 0
    let sinceDraw = 0
    const drawInterval = 1 / DRAW_FPS

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: sizeRef.current,
      height: sizeRef.current,
      phi: phiRef.current,
      theta: THETA,
      dark: 0,
      diffuse: 1.15,
      scale: 1,
      // Fewer dots = far less per-frame GPU work; still reads as a dotted globe.
      mapSamples: 11000,
      mapBrightness: 3.4,
      baseColor: DOT,
      markerColor: SKY,
      glowColor: GLOW,
      offset: [0, 0],
      markers: markersRef.current,
      arcs: arcsRef.current,
      arcColor: SKY,
      arcWidth: 0.4,
      arcHeight: 0.28,
      markerElevation: 0.02,
    })

    // rAF still ticks at the display rate, but we advance rotation by real elapsed
    // time (constant speed under frame drops) and only redraw at DRAW_FPS.
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0
      lastT = t
      if (!draggingRef.current) phiRef.current += ROT_PER_SEC * dt
      sinceDraw += dt
      if (sinceDraw < drawInterval) return
      sinceDraw = 0
      const px = sizeRef.current
      globe.update({
        phi: phiRef.current,
        theta: THETA,
        width: px,
        height: px,
        devicePixelRatio: dpr,
        markers: markersRef.current,
        arcs: arcsRef.current,
      })
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      globe.destroy()
    }
  }, [])

  // Drag-to-spin.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onDown = (e: PointerEvent) => {
      draggingRef.current = true
      dragStartXRef.current = e.clientX
      dragStartPhiRef.current = phiRef.current
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      phiRef.current = dragStartPhiRef.current + (e.clientX - dragStartXRef.current) * 0.006
    }
    const onUp = () => {
      draggingRef.current = false
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div className="lt-globe-wash" />
      <div className="lt-globe-ring" />
      <canvas
        ref={canvasRef}
        className="lt-globe-canvas"
        style={{
          width: 'min(100%, 100vh)',
          aspectRatio: '1 / 1',
          maxHeight: '100%',
          position: 'relative',
        }}
      />
      <div className="lt-globe-vignette" />
    </div>
  )
}
