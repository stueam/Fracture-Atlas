import { useEffect, useRef } from 'react'
import './kinetic-field.css'

/** Pointer parallax moves only the decorative field, never the reading surface. */
export default function KineticField() {
  const field = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const media = matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    )
    let frame = 0
    let x = 0
    let y = 0
    const draw = () => {
      field.current?.style.setProperty('--field-x', `${x}px`)
      field.current?.style.setProperty('--field-y', `${y}px`)
      frame = 0
    }
    const move = (e: PointerEvent) => {
      if (!media.matches || document.hidden) return
      x = (e.clientX / innerWidth - 0.5) * 64
      y = (e.clientY / innerHeight - 0.5) * 42
      if (!frame) frame = requestAnimationFrame(draw)
    }
    const reset = () => {
      x = 0
      y = 0
      if (!frame) frame = requestAnimationFrame(draw)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', reset)
    media.addEventListener('change', reset)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', reset)
      media.removeEventListener('change', reset)
      cancelAnimationFrame(frame)
    }
  }, [])
  return (
    <div className="kinetic-field" ref={field} aria-hidden="true">
      <div className="kinetic-halo" />
      <svg viewBox="0 0 800 700" fill="none" className="kinetic-instrument">
        <g transform="translate(430 340)">
          <g className="kinetic-ring kinetic-ring-outer">
            <circle r="266" />
            <circle r="254" className="kinetic-dashes" />
            {Array.from({ length: 32 }, (_, i) => (
              <path
                key={i}
                transform={`rotate(${i * 11.25})`}
                d={`M 0 -${i % 4 === 0 ? 240 : 246} V -259`}
              />
            ))}
            <path className="kinetic-arc" d="M -266 0 A 266 266 0 0 1 0 -266" />
            <circle className="kinetic-node" cx="0" cy="-266" r="5" />
            <circle className="kinetic-node" cx="0" cy="266" r="3" />
          </g>
          <g className="kinetic-ring kinetic-ring-inner">
            <circle r="195" />
            <path className="kinetic-arc" d="M 195 0 A 195 195 0 0 1 -138 138" />
            <circle className="kinetic-node" cx="195" cy="0" r="6" />
            <path d="M -215 0 H -175 M 175 0 H 215 M 0 -215 V -175 M 0 175 V 215" />
          </g>
          <g className="kinetic-core">
            <path d="M 0 -120 L 104 -60 V 60 L 0 120 L -104 60 V -60 Z M 0 -120 V 120 M -104 -60 L 104 60 M 104 -60 L -104 60" />
            <circle r="135" strokeDasharray="2 12" />
          </g>
          <circle className="kinetic-wave" r="130" />
          <circle className="kinetic-wave kinetic-wave-second" r="130" />
        </g>
        <g className="kinetic-links">
          <path d="M 50 535 H 220 L 310 445 M 85 185 H 205 L 325 280 M 540 425 L 635 520 H 790" />
          <path
            className="kinetic-link-pulse"
            pathLength="1"
            d="M 50 535 H 220 L 310 445 M 85 185 H 205 L 325 280 M 540 425 L 635 520 H 790"
          />
          <circle className="kinetic-node" cx="50" cy="535" r="4" />
          <circle className="kinetic-node" cx="85" cy="185" r="4" />
        </g>
      </svg>
      <div className="kinetic-scan" />
    </div>
  )
}
