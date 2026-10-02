import { useState } from 'react'
import { ArrowUpRight, ChevronDown, MousePointer2 } from 'lucide-react'
import {
  BENCHMARKS,
  METHODS,
  MODELS,
  METHOD_COLORS,
  allocation,
  dollars,
  metricValue,
  number,
  methodFor,
} from '../data'
import type { CostRecord, Study } from '../data'
import { MethodTag, ModelSelect, Note, PageIntro } from '../components/UI'
import type { Inspection } from '../components/UI'

function CostScatter({
  records,
  benchmark,
  select,
}: {
  records: CostRecord[]
  benchmark: string
  select: (r: CostRecord) => void
}) {
  const w = 830,
    h = 360,
    left = 65,
    right = 784,
    top = 28,
    bottom = 297
  const maxCost = Math.max(1, ...records.map((r) => r.total_cost_usd ?? 0)) * 1.25
  const maxScore =
    BENCHMARKS.find((b) => b.name === benchmark)?.scope === 'Discovery'
      ? Math.max(0.1, ...records.map((r) => r.value)) * 1.1
      : 100
  const x = (v: number) => left + (Math.log1p(v) / Math.log1p(maxCost)) * (right - left)
  const y = (v: number) => bottom - (v / maxScore) * (bottom - top)
  const ticks = [0, 0.1, 1, 10, 100, 1000, 10000].filter((t) => t <= maxCost)
  return (
    <svg
      className="cost-scatter"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Recorded total cost and score on ${benchmark}. Select an experiment point for provenance.`}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={left}
            x2={right}
            y1={y(t * maxScore)}
            y2={y(t * maxScore)}
            stroke="#e1e4dc"
            strokeDasharray="4 5"
          />
          <text x={left - 13} y={y(t * maxScore) + 4} textAnchor="end" className="plot-tick">
            {number(t * maxScore, maxScore > 1 ? 0 : 2)}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={bottom} stroke="#edf0e8" />
          <text x={x(t)} y={bottom + 24} textAnchor="middle" className="plot-tick">
            ${t}
          </text>
        </g>
      ))}
      <text x={left} y="15" className="plot-axis">
        Reported score / native quality
      </text>
      <text x={right} y={h - 9} textAnchor="end" className="plot-axis">
        Recorded total cost (USD · log(1 + cost) scale)
      </text>
      {records.map((r, i) => (
        <g
          key={r.id}
          className="scatter-point"
          role="button"
          tabIndex={0}
          aria-label={`${r.method}: score ${metricValue(r.value, benchmark)}, cost ${dollars(r.total_cost_usd)}`}
          onClick={() => select(r)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              select(r)
            }
          }}
        >
          <title>
            {r.method} · {dollars(r.total_cost_usd)} · {metricValue(r.value, benchmark)}
          </title>
          <circle cx={x(r.total_cost_usd!)} cy={y(r.value)} r="17" fill="transparent" />
          <circle
            cx={x(r.total_cost_usd!)}
            cy={y(r.value)}
            r="7"
            fill={METHOD_COLORS[r.method]}
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={x(r.total_cost_usd!) + (i % 2 ? -13 : 13)}
            y={y(r.value) - 13}
            textAnchor={i % 2 ? 'end' : 'start'}
            className="plot-label"
          >
            {r.method}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Costs({
  data,
  inspect,
}: {
  data: Study
  inspect: (r: Inspection) => void
}) {
  const [benchmark, setBenchmark] = useState('Spider')
  const [model, setModel] = useState<string>(MODELS[0])
  const records = data.costs.records.filter((r) => r.benchmark === benchmark && r.model === model)
  const aligned = records.filter((r) => {
    const m = methodFor(data, benchmark, model, r.method)
    return (
      m &&
      m.value !== null &&
      !m.exclusion &&
      Math.abs(m.value - r.value) < 0.00001 &&
      m.source?.trace === r.trace
    )
  })
  const plotted = aligned.filter(
    (r) => r.total_cost_usd !== null && r.total_cost_usd >= 0 && Number.isFinite(r.value),
  )
  return (
    <>
      <PageIntro
        eyebrow="Resources behind the result"
        title="Cost explorer"
        text="Inspect score and recorded spend within one task. Open a run to see cost components and allocation uncertainty."
      />
      <div className="cost-controls">
        <label className="select-field">
          <span>Benchmark</span>
          <div className="select-wrap">
            <select
              aria-label="Cost benchmark"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
            >
              {BENCHMARKS.map((b) => (
                <option key={b.name}>{b.name}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <ModelSelect value={model} onChange={setModel} />
        <span className="cost-count">{plotted.length} plotted experiments</span>
      </div>
      <div className="cost-plot-card">
        <div className="cost-plot-head">
          <div>
            <h2>{benchmark}</h2>
            <p>{model} · exact endpoint alignment</p>
          </div>
          <span>
            <MousePointer2 size={14} />
            Select a point
          </span>
        </div>
        {plotted.length ? (
          <CostScatter
            records={plotted}
            benchmark={benchmark}
            select={(r) => inspect({ kind: 'cost', record: r })}
          />
        ) : (
          <div className="empty-state">
            <h3>No aligned cost records to plot.</h3>
            <p>Try another model or benchmark. Unreported costs are kept missing.</p>
          </div>
        )}
        <div className="plot-legend">
          {METHODS.map((m) => (
            <MethodTag key={m} method={m} />
          ))}
        </div>
      </div>
      <Note compact>
        Recorded total includes the reported stages of each run. Coverage differs by method; a lower
        recorded total does not imply a lower complete deployment cost. Allocation intervals
        separate adaptation from final evaluation when their charges were bundled.
      </Note>
      <div className="table-container cost-table-wrap">
        <table className="cost-table">
          <thead>
            <tr>
              <th>Method / recipe</th>
              <th>Endpoint</th>
              <th>Recorded total</th>
              <th>Adaptation allocation</th>
              <th>Accounting</th>
              <th>
                <span className="sr-only">Inspect record</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {aligned.map((r) => (
              <tr key={r.id}>
                <td>
                  <MethodTag method={r.method} />
                </td>
                <td>{metricValue(r.value, benchmark)}</td>
                <td>{dollars(r.total_cost_usd)}</td>
                <td>
                  {allocation(r)}
                  {r.allocation_interval && r.adaptation_lower_usd !== null && (
                    <small>Allocation interval</small>
                  )}
                </td>
                <td>
                  <span className="status-tag">{r.cost_status}</span>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Inspect ${r.method} cost`}
                    onClick={() => inspect({ kind: 'cost', record: r })}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!aligned.length && (
          <div className="empty-state">
            No aligned cost records reported for this model and task.
          </div>
        )}
      </div>
      <div className="reading-guide">
        <h3>What the costs can tell you</h3>
        <div>
          <p>
            <b>Recorded scope.</b> API charges, teacher data, and training stages are preserved as
            reported. Missing human effort and infrastructure costs are not assigned invented
            prices.
          </p>
          <p>
            <b>Allocation uncertainty.</b> A range means the source bundles adaptation and
            evaluation charges. It is an accounting interval, not a statistical confidence interval.
          </p>
          <p>
            <b>Endpoint alignment.</b> A historical cost is displayed only when its score matches
            the selected current method endpoint for the exact model version.
          </p>
        </div>
      </div>
    </>
  )
}
