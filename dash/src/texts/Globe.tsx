import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import type { TextCity } from '../shared/types'
import { rgb01, theme } from '../shared/theme'

// Phoebe "hub" for the live arcs — SF HQ. Arcs fire hub -> event city.
const HUB: [number, number] = [37.77, -122.42]
// US-forward framing: face North America, gentle tilt.
const START_PHI = 4.9
const THETA = 0.32
const AUTO_SPEED = 0.0022

const CYAN = rgb01(theme.texts)
const IMSG = rgb01(theme.green)

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
      color: a.channel === 'imessage' ? IMSG : CYAN,
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let raf = 0

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: sizeRef.current,
      height: sizeRef.current,
      phi: phiRef.current,
      theta: THETA,
      dark: 1,
      diffuse: 1.25,
      scale: 1,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.28, 0.31, 0.36],
      markerColor: CYAN,
      glowColor: [0.16, 0.42, 0.56],
      offset: [0, 0],
      markers: markersRef.current,
      arcs: arcsRef.current,
      arcColor: CYAN,
      arcWidth: 0.55,
      arcHeight: 0.32,
      markerElevation: 0.02,
    })

    const frame = () => {
      if (!draggingRef.current) phiRef.current += AUTO_SPEED
      const px = sizeRef.current
      // update() re-renders with the latest phi + live markers/arcs.
      globe.update({
        phi: phiRef.current,
        theta: THETA,
        width: px,
        height: px,
        devicePixelRatio: dpr,
        markers: markersRef.current,
        arcs: arcsRef.current,
      })
      raf = requestAnimationFrame(frame)
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
      <div
        className="lt-glow"
        style={{
          width: '62%',
          height: '62%',
          background: `radial-gradient(circle, ${theme.cyan} 0%, transparent 70%)`,
        }}
      />
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
    </div>
  )
}
