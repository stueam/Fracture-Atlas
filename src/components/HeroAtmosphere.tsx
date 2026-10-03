import { useEffect, useRef, useState } from 'react'

/** Decorative motion stays inside the hero and sleeps when it leaves the viewport. */
export default function HeroAtmosphere() {
  const layer = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let visible = false
    const sync = () => setRunning(visible && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    if (layer.current) observer.observe(layer.current)
    document.addEventListener('visibilitychange', sync)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return (
    <div className="hero-atmosphere" ref={layer} data-running={running} aria-hidden="true">
      <div className="hero-ambient-field">
        <div className="hero-glow hero-glow-cool" />
        <div className="hero-glow hero-glow-warm" />
      </div>
      <svg className="fracture-motif" viewBox="0 0 340 320">
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} style={{ animationDelay: `${i * 45}ms` }}>
            <path
              className="fracture-line-left"
              pathLength="1"
              d={`M 10 ${105 + i * 25} L 80 ${65 + i * 25} H 136 L 158 ${32 + i * 25}`}
            />
            <path
              className="fracture-line-right"
              pathLength="1"
              d={`M 178 ${43 + i * 25} L 200 ${10 + i * 25} H 256 L 330 ${-32 + i * 25}`}
            />
          </g>
        ))}
        <circle cx="80" cy="90" r="3" />
        <circle cx="136" cy="165" r="3" />
        <circle cx="200" cy="110" r="3" />
        <circle cx="256" cy="185" r="3" />
        <path
          className="fracture-pulse fracture-line-left"
          pathLength="1"
          d="M 10 180 L 80 140 H 136 L 158 107"
        />
        <path
          className="fracture-pulse fracture-pulse-warm fracture-line-right"
          pathLength="1"
          d="M 178 193 L 200 160 H 256 L 330 118"
        />
      </svg>
    </div>
  )
}
