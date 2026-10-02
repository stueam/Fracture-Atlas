import { useMemo, useState } from 'react'
import { ArrowUpRight, Download, Search, SlidersHorizontal } from 'lucide-react'
import {
  BENCHMARKS,
  METHODS,
  MODELS,
  assetUrl,
  matchedFor,
  methodFor,
  metricValue,
  number,
} from '../data'
import type { MethodRecord, Study } from '../data'
import { MethodTag, ModelSelect, Note, PageIntro } from '../components/UI'
import type { Inspection } from '../components/UI'

export default function Results({
  data,
  inspect,
}: {
  data: Study
  inspect: (record: Inspection) => void
}) {
  const [model, setModel] = useState<string>(MODELS[0])
  const [view, setView] = useState<'endpoint' | 'matched'>('endpoint')
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('All families')
  const [order, setOrder] = useState('Benchmark order')
  const benchmarks = useMemo(() => {
    const rows = BENCHMARKS.filter(
      (b) =>
        b.name.toLowerCase().includes(query.toLowerCase()) &&
        (family === 'All families' || family === b.family),
    )
    if (order === 'Name A–Z') rows.sort((a, b) => a.name.localeCompare(b.name))
    if (order === 'Most coverage')
      rows.sort(
        (a, b) =>
          METHODS.filter((m) => methodFor(data, b.name, model, m)?.value != null).length -
          METHODS.filter((m) => methodFor(data, a.name, model, m)?.value != null).length,
      )
    return rows
  }, [data, model, query, family, order])
  const reported = data.methods.records.filter(
    (r) => r.model === model && r.value !== null && !r.exclusion,
  ).length
  const matched = data.methods.records.filter(
    (r) => r.model === model && matchedFor(data, r),
  ).length
  function Cell({ record }: { record: MethodRecord | undefined }) {
    if (!record || record.value === null || record.exclusion)
      return (
        <td>
          <span className="missing-cell" title={record?.exclusion || 'No result reported'}>
            {record?.exclusion ? 'Excluded' : '—'}
          </span>
        </td>
      )
    const control = matchedFor(data, record)
    if (view === 'matched' && !control)
      return (
        <td>
          <span className="missing-cell" title="No compatible matched control linked">
            —
          </span>
        </td>
      )
    const delta = control ? record.value - control.value : 0
    return (
      <td>
        <button
          className={`score-cell ${view === 'matched' ? (delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'neutral') : ''}`}
          onClick={() => inspect({ kind: 'method', record })}
        >
          <span>
            {view === 'matched'
              ? `${delta > 0 ? '+' : ''}${number(delta, BENCHMARKS.find((b) => b.name === record.benchmark)?.scope === 'Discovery' ? 4 : 2)}`
              : metricValue(record.value, record.benchmark)}
          </span>
          <small>
            {view === 'matched'
              ? `${metricValue(control!.value, record.benchmark)} → ${metricValue(record.value, record.benchmark)}`
              : record.source?.recipe?.includes('Kimi')
                ? 'Kimi recipe'
                : record.method === 'SkillOpt'
                  ? 'Selected recipe'
                  : 'View record'}
            <ArrowUpRight size={10} />
          </small>
        </button>
      </td>
    )
  }
  return (
    <>
      <PageIntro
        eyebrow="Interactive evidence"
        title="Results explorer"
        text="Compare methods within a task. Inspect each result to see its recipe, matched control, and source."
      >
        <a className="button secondary" href={assetUrl('data/study.json')} download>
          <Download size={15} />
          Data snapshot
        </a>
      </PageIntro>
      <div className="explorer-summary">
        <div>
          <strong>{reported}</strong>
          <span>reported method endpoints</span>
        </div>
        <div>
          <strong>{matched}</strong>
          <span>linked matched controls</span>
        </div>
        <div>
          <strong>{model}</strong>
          <span>exact model version</span>
        </div>
        <span className="snapshot-label">Snapshot · {data.commit.slice(0, 7)}</span>
      </div>
      <div className="explorer-toolbar">
        <div className="segmented" role="group" aria-label="Result view">
          <button
            className={view === 'endpoint' ? 'active' : ''}
            onClick={() => setView('endpoint')}
          >
            Reported endpoints
          </button>
          <button className={view === 'matched' ? 'active' : ''} onClick={() => setView('matched')}>
            Matched gains
          </button>
        </div>
        <ModelSelect value={model} onChange={setModel} />
      </div>
      <Note compact>
        {view === 'endpoint'
          ? 'Scores describe selected reported runs. Recipes and evaluation protocols can differ across cells; each task retains its original metric.'
          : 'Gains are computed only when benchmark, exact model version, method, endpoint score, and trace agree with a recorded matched control. Percentage-point gains and native quality differences remain separate.'}
        {model === MODELS[2] &&
          ' Qwen3.8-27B is a supplemental model version with sparse method coverage.'}
      </Note>
      <div className="table-filter">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search benchmarks"
            placeholder="Find a benchmark…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-controls">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Capability family"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            <option>All families</option>
            {[...new Set(BENCHMARKS.map((b) => b.family))].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <select
            aria-label="Sort results"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option>Benchmark order</option>
            <option>Name A–Z</option>
            <option>Most coverage</option>
          </select>
          <span>{benchmarks.length} tasks</span>
        </div>
      </div>
      <div className="table-container">
        <table className="result-table">
          <thead>
            <tr>
              <th>
                Benchmark <span>Metric / capability</span>
              </th>
              {METHODS.map((m) => (
                <th key={m}>
                  <MethodTag method={m} />
                  <span>{view === 'matched' ? 'Matched difference' : 'Reported score'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b) => (
              <tr key={b.name}>
                <td>
                  <a className="benchmark-name" href={`#/benchmarks/${b.slug}`}>
                    {b.name}
                    <ArrowUpRight size={12} />
                  </a>
                  <small>
                    {b.metric} <span>·</span> {b.family}
                  </small>
                </td>
                {METHODS.map((m) => (
                  <Cell key={m} record={methodFor(data, b.name, model, m)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!benchmarks.length && (
          <div className="empty-state">
            <Search size={24} />
            <h3>No benchmarks match these filters.</h3>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('')
                setFamily('All families')
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
      <div className="table-caption">
        <span>Click a score to inspect its experiment record.</span>
        <span>— Not reported / no compatible control · Excluded: source exclusion preserved</span>
      </div>
      <div className="reading-guide">
        <h3>How to read this view</h3>
        <div>
          <p>
            <b>Exact versions.</b> The 8B, Qwen3.6-27B, and Qwen3.8-27B experiments are separate. A
            missing experiment is never filled from another model.
          </p>
          <p>
            <b>Native metrics.</b> Generalization tasks use their reported percentage metrics.
            Discovery tasks use quality; their values are not percentages.
          </p>
          <p>
            <b>Run-level evidence.</b> These cells report selected recipes, not a universal method
            ranking. See task pages for descriptive frontier references.
          </p>
        </div>
      </div>
    </>
  )
}
