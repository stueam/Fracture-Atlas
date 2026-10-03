import { useEffect, useState } from 'react'
import './page-motion.css'

/** Decorative only: independent of chart values and never captures pointer input. */
export default function PageAtmosphere({ path }: { path: string }) {
  const [running, setRunning] = useState(!document.hidden)
  useEffect(() => {
    const sync = () => setRunning(!document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  const variant = path.split('/')[1]
  return (
    <div
      className="page-atmosphere"
      data-variant={variant}
      data-running={running}
      aria-hidden="true"
    >
      <div className="page-aura page-aura-primary" />
      <div className="page-aura page-aura-secondary" />
      <svg className="page-signal-field" viewBox="0 0 900 600" fill="none">
        <g className="page-contours">
          {Array.from({ length: 11 }, (_, i) => (
            <path
              key={i}
              d={`M ${80 + i * 22} -20 C ${680 + i * 18} 85, ${-80 + i * 24} 325, ${530 + i * 29} 640`}
            />
          ))}
        </g>
        {[2, 5, 8].map((i, index) => (
          <path
            key={i}
            className="page-signal"
            pathLength="1"
            style={{ animationDelay: `${index * -3}s` }}
            d={`M ${80 + i * 22} -20 C ${680 + i * 18} 85, ${-80 + i * 24} 325, ${530 + i * 29} 640`}
          />
        ))}
        <g className="page-orbit" transform="translate(625 225)">
          <circle r="130" />
          <circle r="94" />
          <g className="page-orbit-rotor">
            <path d="M -130 0 A 130 130 0 0 1 0 -130" />
            <circle cx="0" cy="-130" r="4" />
          </g>
        </g>
      </svg>
      <div className="page-edge-stream page-edge-left" />
      <div className="page-edge-stream page-edge-right" />
    </div>
  )
}
