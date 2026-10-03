import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface PointDetails {
  anchor: HTMLButtonElement
  benchmark: string
  series: string
  label: string
  score: string
  unit: string
}

export default function PointTooltip({ point }: { point: PointDetails }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 12, top: 12 })

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const anchor = point.anchor.getBoundingClientRect()
    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    const above = anchor.top - box.height - 12
    setPosition({
      left: Math.max(
        12,
        Math.min(width - box.width - 12, anchor.left + anchor.width / 2 - box.width / 2),
      ),
      top: Math.max(
        12,
        Math.min(height - box.height - 12, above >= 12 ? above : anchor.bottom + 12),
      ),
    })
  }, [point])

  return createPortal(
    <div
      id="atlas-point-tooltip"
      className="atlas-point-tooltip"
      ref={ref}
      role="tooltip"
      style={position}
    >
      <strong>{point.benchmark}</strong>
      <span>{point.label}</span>
      <b>
        {point.score}
        <small>{point.unit}</small>
      </b>
    </div>,
    document.body,
  )
}
