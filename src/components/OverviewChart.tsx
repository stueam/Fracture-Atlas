import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, ChevronDown, Info } from 'lucide-react'
import { BENCHMARKS, MODELS, metricValue, overviewFor } from '../data'
import type { Benchmark, Study } from '../data'

const series = [
  { key: 'base', label: 'Target baseline', color: '#5d6959' },
  { key: 'adapted', label: 'Best tested adaptation', color: '#b95435' },
  { key: 'kimi', label: 'Kimi K3', color: '#477665' },
  { key: 'deepseek', label: 'DS v4 Pro', color: '#74619a' },
] as const

function taskValues(data: Study, task: string, model: string) {
  const record = overviewFor(data, task, model)
  return {
    base: record?.baseline ?? null,
    adapted: record?.best_tested_adaptation?.value ?? null,
    kimi: overviewFor(data, task, 'Kimi K3')?.baseline ?? null,
    deepseek: overviewFor(data, task, 'DS v4 Pro')?.baseline ?? null,
  }
}

function PlotTrack({
  data,
  benchmark,
  model,
  references,
  select,
  native = false,
}: {
  data: Study
  benchmark: Benchmark
  model: string
  references: boolean
  select: () => void
  native?: boolean
}) {
  const values = taskValues(data, benchmark.name, model)
  const max = native
    ? Math.max(0.001, ...Object.values(values).filter((v): v is number => v !== null)) * 1.08
    : 100
  const visibleSeries = series.filter((s) => references || s.key === 'base' || s.key === 'adapted')
  return (
    <div
      className={`atlas-track ${native ? 'native' : ''}`}
      aria-label={`${benchmark.name} reported scores`}
    >
      {[0, 25, 50, 75, 100].map((tick) => (
        <i className="atlas-gridline" key={tick} style={{ left: `${tick}%` }} />
      ))}
      {visibleSeries.map((s) => {
        const value = values[s.key]
        if (value === null) return null
        return (
          <button
            key={s.key}
            type="button"
            className={`atlas-marker ${s.key}`}
            style={
              {
                left: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
                '--series-color': s.color,
              } as CSSProperties
            }
            title={`${benchmark.name} · ${s.label}: ${metricValue(value, benchmark.name)}${native ? ' quality' : '%'}`}
            aria-label={`${benchmark.name}, ${s.label}, ${metricValue(value, benchmark.name)}`}
            onClick={select}
          >
            <span />
          </button>
        )
      })}
      {native && (
        <div className="native-axis">
          <span>0</span>
          <span>{max.toFixed(4)} quality</span>
        </div>
      )}
    </div>
  )
}

export default function OverviewChart({ data }: { data: Study }) {
  const [model, setModel] = useState<string>(MODELS[0])
  const [references, setReferences] = useState(true)
  const [selected, setSelected] = useState('LiveMath')
  const benchmark = BENCHMARKS.find((b) => b.name === selected)!
  const record = overviewFor(data, selected, model)
  const values = taskValues(data, selected, model)
  const general = BENCHMARKS.filter((b) => b.scope === 'Generalization')
  const discovery = BENCHMARKS.filter((b) => b.scope === 'Discovery')
  return (
    <section className="atlas-section" aria-labelledby="atlas-title">
      <div className="atlas-title-row">
        <div>
          <span className="eyebrow">THE COMPLETE STUDY</span>
          <h2 id="atlas-title">The capability landscape</h2>
          <p>All 16 benchmarks. Target baselines, tested adaptations, and frontier references.</p>
        </div>
        <span className="atlas-count">16 / 16 benchmarks</span>
      </div>
      <div className="atlas-controls">
        <label className="atlas-model-control">
          Target model
          <div className="select-wrap">
            <select
              aria-label="Overview model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </label>
        <label className="atlas-toggle">
          <input
            type="checkbox"
            checked={references}
            onChange={(e) => setReferences(e.target.checked)}
          />
          <span>Show frontier references</span>
        </label>
      </div>
      <div className="atlas-legend">
        {series
          .filter((s) => references || s.key === 'base' || s.key === 'adapted')
          .map((s) => (
            <span key={s.key}>
              <i className={s.key} style={{ '--series-color': s.color } as CSSProperties} />
              {s.label}
            </span>
          ))}
      </div>
      <div className="atlas-chart-panel">
        <div className="atlas-chart-heading">
          <h3>Generalization</h3>
          <span>13 tasks · reported percentage metrics</span>
        </div>
        <div className="atlas-scroll">
          <div className="atlas-general-chart">
            <div className="atlas-axis-row">
              <span>Benchmark</span>
              <div>
                {[0, 25, 50, 75, 100].map((v) => (
                  <span key={v} style={{ left: `${v}%` }}>
                    {v}
                  </span>
                ))}
              </div>
              <span>Best adaptation</span>
            </div>
            {general.map((b, index) => {
              const adapted = overviewFor(data, b.name, model)?.best_tested_adaptation
              return (
                <div
                  className={`atlas-task-row ${selected === b.name ? 'selected' : ''}`}
                  key={b.name}
                  role="group"
                  aria-label={`${b.name} benchmark`}
                >
                  <button
                    className="atlas-task-label"
                    onClick={() => setSelected(b.name)}
                    aria-pressed={selected === b.name}
                  >
                    <span className="atlas-task-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="atlas-task-name">
                      <strong>{b.name}</strong>
                      <span>{b.family}</span>
                    </span>
                  </button>
                  <PlotTrack
                    data={data}
                    benchmark={b}
                    model={model}
                    references={references}
                    select={() => setSelected(b.name)}
                  />
                  <button
                    className="atlas-endpoint"
                    onClick={() => setSelected(b.name)}
                    aria-label={`${b.name}, best adaptation ${metricValue(adapted?.value, b.name)}`}
                  >
                    <strong>{metricValue(adapted?.value, b.name)}</strong>
                    <span>{b.metric}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="atlas-discovery-heading">
          <h3>Discovery</h3>
          <span>3 tasks · individual native quality scales</span>
        </div>
        <div className="atlas-discovery-grid">
          {discovery.map((b) => (
            <div
              className={`atlas-discovery-card ${selected === b.name ? 'selected' : ''}`}
              key={b.name}
            >
              <button
                className="atlas-discovery-label"
                onClick={() => setSelected(b.name)}
                aria-pressed={selected === b.name}
              >
                <strong>{b.name}</strong>
                <span>
                  Best adaptation{' '}
                  <b>
                    {metricValue(
                      overviewFor(data, b.name, model)?.best_tested_adaptation?.value,
                      b.name,
                    )}
                  </b>
                </span>
              </button>
              <PlotTrack
                data={data}
                benchmark={b}
                model={model}
                references={references}
                select={() => setSelected(b.name)}
                native
              />
            </div>
          ))}
        </div>
      </div>
      <div className="atlas-inspector" aria-live="polite">
        <div className="atlas-inspector-heading">
          <div>
            <span className="eyebrow">SELECTED BENCHMARK</span>
            <h3>{selected}</h3>
            <p>
              {record?.best_tested_adaptation?.method ||
                'No adaptation endpoint reported for this model.'}
            </p>
          </div>
          <a
            className="button secondary"
            href={`#/benchmarks/${benchmark.slug}?model=${encodeURIComponent(model)}`}
          >
            Open benchmark <ArrowRight size={16} />
          </a>
        </div>
        <dl className="atlas-record-values">
          {series
            .filter((s) => references || s.key === 'base' || s.key === 'adapted')
            .map((s) => (
              <div key={s.key}>
                <dt>
                  <i style={{ background: s.color }} />
                  {s.label}
                </dt>
                <dd>
                  {metricValue(values[s.key], selected)}
                  <span>{benchmark.scope === 'Discovery' ? 'quality' : '%'}</span>
                </dd>
              </div>
            ))}
        </dl>
      </div>
      <p className="atlas-context">
        <Info size={18} />
        <span>
          Descriptive results from the paper’s overview snapshot. Evaluation protocols may differ
          between runs. Discovery scales are independent; use matched controls in Results to measure
          adaptation gain.
        </span>
      </p>
    </section>
  )
}
