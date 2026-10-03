import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, ChevronDown, Info } from 'lucide-react'
import { BENCHMARKS, MODELS, metricValue, overviewFor } from '../data'
import type { Benchmark, Study } from '../data'
import PointTooltip from './PointTooltip'
import type { PointDetails } from './PointTooltip'

const series = [
  { key: 'base', label: 'Target baseline', color: 'var(--series-baseline)' },
  { key: 'adapted', label: 'Best tested adaptation', color: 'var(--series-adapted)' },
  { key: 'kimi', label: 'Kimi K3', color: 'var(--series-kimi)' },
  { key: 'deepseek', label: 'DS v4 Pro', color: 'var(--series-deepseek)' },
] as const

type Series = (typeof series)[number]
interface PointInteraction {
  activePoint: PointDetails | null
  showPoint: (
    anchor: HTMLButtonElement,
    benchmark: Benchmark,
    series: Series,
    value: number,
  ) => void
  hidePoint: (anchor: HTMLButtonElement) => void
}

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
  interaction,
}: {
  data: Study
  benchmark: Benchmark
  model: string
  references: boolean
  select: () => void
  native?: boolean
  interaction: PointInteraction
}) {
  const values = taskValues(data, benchmark.name, model)
  const max = native
    ? Math.max(0.001, ...Object.values(values).filter((v): v is number => v !== null)) * 1.08
    : 100
  const activeSeries =
    interaction.activePoint?.benchmark === benchmark.name
      ? (interaction.activePoint.series as Series['key'])
      : null
  const activeValue = activeSeries ? values[activeSeries] : null
  return (
    <div
      className={`atlas-track ${native ? 'native' : ''}`}
      aria-label={`${benchmark.name} reported scores`}
    >
      {[0, 25, 50, 75, 100].map((tick) => (
        <i className="atlas-gridline" key={tick} style={{ left: `${tick}%` }} />
      ))}
      {activeValue !== null && (
        <i
          className="atlas-point-guide"
          aria-hidden="true"
          style={{ left: `${Math.max(0, Math.min(100, (activeValue / max) * 100))}%` }}
        />
      )}
      {series.map((s) => {
        const value = values[s.key]
        if (value === null) return null
        const hidden = !references && (s.key === 'kimi' || s.key === 'deepseek')
        const active = activeSeries === s.key
        return (
          <button
            key={s.key}
            type="button"
            className={`atlas-marker ${s.key} ${hidden ? 'is-hidden' : ''} ${active ? 'is-active' : ''}`}
            style={
              {
                left: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
                '--series-color': s.color,
              } as CSSProperties
            }
            aria-label={`${benchmark.name}, ${s.label}, ${metricValue(value, benchmark.name)}`}
            aria-hidden={hidden || undefined}
            aria-describedby={active ? 'atlas-point-tooltip' : undefined}
            tabIndex={hidden ? -1 : 0}
            disabled={hidden}
            onPointerEnter={(e) => interaction.showPoint(e.currentTarget, benchmark, s, value)}
            onPointerLeave={(e) => {
              if (document.activeElement !== e.currentTarget) interaction.hidePoint(e.currentTarget)
            }}
            onFocus={(e) => interaction.showPoint(e.currentTarget, benchmark, s, value)}
            onBlur={(e) => interaction.hidePoint(e.currentTarget)}
            onClick={(e) => {
              select()
              interaction.showPoint(e.currentTarget, benchmark, s, value)
            }}
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
  const [activePoint, setActivePoint] = useState<PointDetails | null>(null)
  useEffect(() => {
    const dismiss = () => setActivePoint(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    const onPointer = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.atlas-marker')) dismiss()
    }
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [])
  const interaction: PointInteraction = {
    activePoint,
    showPoint: (anchor, benchmark, s, value) =>
      setActivePoint({
        anchor,
        benchmark: benchmark.name,
        series: s.key,
        label: s.label,
        score: metricValue(value, benchmark.name),
        unit: benchmark.scope === 'Discovery' ? 'quality' : '%',
      }),
    hidePoint: (anchor) => setActivePoint((point) => (point?.anchor === anchor ? null : point)),
  }
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
              onChange={(e) => {
                setActivePoint(null)
                setModel(e.target.value)
              }}
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
            onChange={(e) => {
              setActivePoint(null)
              setReferences(e.target.checked)
            }}
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
                    interaction={interaction}
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
                interaction={interaction}
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
      {activePoint && <PointTooltip point={activePoint} />}
    </section>
  )
}
