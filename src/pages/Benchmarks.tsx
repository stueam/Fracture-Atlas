import { useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from 'lucide-react'
import {
  BENCHMARKS,
  METHODS,
  MODELS,
  METHOD_NAMES,
  methodFor,
  metricValue,
  overviewFor,
  matchedFor,
  routeValue,
} from '../data'
import type { Benchmark, Study } from '../data'
import { MethodTag, ModelSelect, Note, PageIntro, SectionTitle } from '../components/UI'
import type { Inspection } from '../components/UI'

export function BenchmarkRegistry() {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('All benchmarks')
  const visible = BENCHMARKS.filter(
    (b) =>
      `${b.name} ${b.family} ${b.description}`.toLowerCase().includes(query.toLowerCase()) &&
      (scope === 'All benchmarks' || b.scope === scope),
  )
  return (
    <>
      <PageIntro
        eyebrow="The capability map"
        title="Benchmark registry"
        text="Sixteen distinct workloads, each with its own metric and evaluation context."
      />
      <div className="registry-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search registry"
            placeholder="Search tasks or capabilities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="segmented" role="group" aria-label="Benchmark scope">
          {['All benchmarks', 'Generalization', 'Discovery'].map((s) => (
            <button className={scope === s ? 'active' : ''} onClick={() => setScope(s)} key={s}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="registry-grid">
        {visible.map((b, i) => (
          <a className="registry-card" key={b.name} href={`#/benchmarks/${b.slug}`}>
            <div className="registry-card-top">
              <span className="tiny-label">{b.family}</span>
              <span className="registry-index">
                {String(BENCHMARKS.indexOf(b) + 1).padStart(2, '0')}
              </span>
            </div>
            <h2>{b.name}</h2>
            <p>{b.description}</p>
            <div className="registry-card-bottom">
              <span className={`scope-tag ${b.scope === 'Discovery' ? 'discovery' : ''}`}>
                {b.scope}
              </span>
              <span>
                {b.metric} <ArrowUpRight size={14} />
              </span>
            </div>
            <span className="sr-only">
              {i + 1} of {visible.length} matching benchmarks
            </span>
          </a>
        ))}
      </div>
      {!visible.length && <div className="empty-state">No matching benchmarks.</div>}
      <Note>
        Discovery workloads use native quality measures and feasibility-aware protocols. Their
        scores should be inspected within the task, rather than averaged with generalization
        metrics.
      </Note>
    </>
  )
}

export function BenchmarkDetail({
  benchmark: b,
  data,
  inspect,
}: {
  benchmark: Benchmark
  data: Study
  inspect: (record: Inspection) => void
}) {
  const [model, setModel] = useState<string>(() => routeValue('model', MODELS, MODELS[0]))
  const baseline = overviewFor(data, b.name, model)
  const available = METHODS.map((m) => methodFor(data, b.name, model, m)).filter(
    (r) => r?.value !== null && r?.value !== undefined && !r?.exclusion,
  ).length
  return (
    <>
      <a href="#/benchmarks" className="back-link">
        <ArrowLeft size={14} />
        All benchmarks
      </a>
      <PageIntro eyebrow={`${b.family} / ${b.scope}`} title={b.name} text={b.description}>
        <ModelSelect value={model} onChange={setModel} />
      </PageIntro>
      <div className="task-overview">
        <div>
          <span className="tiny-label">TASK METRIC</span>
          <strong>{b.metric}</strong>
          <p>
            {b.scope === 'Discovery'
              ? 'Task-native quality scale'
              : 'Original benchmark evaluation'}
          </p>
        </div>
        <div>
          <span className="tiny-label">REPORTED BASELINE</span>
          <strong>{metricValue(baseline?.baseline, b.name)}</strong>
          <p>{model} · descriptive reference</p>
        </div>
        <div>
          <span className="tiny-label">METHOD COVERAGE</span>
          <strong>
            {available} <span>/ 5</span>
          </strong>
          <p>Reported, non-excluded endpoints</p>
        </div>
      </div>
      <Note compact>
        Baseline and frontier references below are descriptive. Adaptation gain is shown only where
        a matching control is linked to the method endpoint.
        {baseline?.caveat
          ? ' The overview source flags protocol differences for this model and task.'
          : ''}
      </Note>
      <section className="detail-section">
        <SectionTitle
          number="01"
          title="Adaptation methods"
          description={`Exact model version: ${model}. Click a reported method to inspect its run.`}
        />
        <div className="method-grid">
          {METHODS.map((m) => {
            const r = methodFor(data, b.name, model, m),
              pair = matchedFor(data, r)
            const present = r && r.value !== null && !r.exclusion
            return (
              <button
                key={m}
                disabled={!present}
                className={`method-card ${!present ? 'unavailable' : ''}`}
                onClick={() => r && inspect({ kind: 'method', record: r })}
              >
                <MethodTag method={m} />
                <h3>{METHOD_NAMES[m]}</h3>
                <strong>{metricValue(r?.value, b.name)}</strong>
                <p>
                  {r?.exclusion
                    ? `Excluded: ${r.exclusion}`
                    : present
                      ? r.source?.recipe
                      : 'No experiment reported'}
                </p>
                <div>
                  {pair ? (
                    <span>Matched control: {metricValue(pair.value, b.name)}</span>
                  ) : (
                    <span>{present ? 'Reported endpoint' : 'Coverage unavailable'}</span>
                  )}
                  {present && <ArrowUpRight size={14} />}
                </div>
              </button>
            )
          })}
        </div>
      </section>
      <section className="detail-section">
        <SectionTitle
          number="02"
          title="Frontier references"
          description="Unadapted comparison models from the overview snapshot."
        />
        <div className="frontier-grid">
          {['Kimi K3', 'DS v4 Pro'].map((m) => {
            const r = overviewFor(data, b.name, m)
            return (
              <div className="frontier-card" key={m}>
                <div>
                  <span className="tiny-label">FRONTIER REFERENCE</span>
                  <h3>{m}</h3>
                </div>
                <strong>
                  {metricValue(r?.baseline, b.name)}
                  <small>{b.metric}</small>
                </strong>
              </div>
            )
          })}
        </div>
      </section>
      <div className="task-next">
        <div>
          <h3>Put this task in context.</h3>
          <p>Inspect recorded costs or compare the full method matrix.</p>
        </div>
        <a
          href={`#/costs?model=${encodeURIComponent(model)}&task=${encodeURIComponent(b.name)}`}
          className="button secondary"
        >
          Cost explorer <ArrowRight size={15} />
        </a>
        <a href={`#/results?model=${encodeURIComponent(model)}`} className="button primary">
          All results <ArrowUpRight size={15} />
        </a>
      </div>
    </>
  )
}
