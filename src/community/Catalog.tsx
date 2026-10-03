import { useEffect, useState } from 'react'
import { ArrowUpRight, Database, FlaskConical, Layers3 } from 'lucide-react'
import { publications } from './api'
import { client, errorMessage, rpc } from './client'
import { ConnectionNotice, useAuth } from './Auth'
import { Pagination, AccessGate } from './Submissions'
import { PayloadPreview } from './Submit'
import { kinds, kindLabel } from './types'
import type { Kind, Publication } from './types'

export const publicationUrl = (id: string) => `#/community/publications/${id}`
const labels: Record<Kind, string> = {
  benchmark: 'Benchmarks',
  method: 'Methods',
  result: 'Results',
}
const icons = { benchmark: Database, method: Layers3, result: FlaskConical }

export function Catalog() {
  const query = new URLSearchParams(location.hash.split('?')[1])
  const selected = query.get('kind') as Kind
  const kind = kinds.includes(selected) ? selected : 'result'
  const [search, setSearch] = useState(query.get('q') ?? '')
  const [term, setTerm] = useState(search)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<Publication[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(Boolean(client))
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(Boolean(client))
    publications(kind, term, page)
      .then((r) => {
        if (alive) {
          setRows(r.rows)
          setCount(r.count)
          setError('')
        }
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [kind, term, page, tick])
  return (
    <section className="community-page">
      <div className="community-hero">
        <div className="community-heading">
          <span className="eyebrow">Aetherheart · Open research</span>
          <h1>
            Build the next
            <br />
            capability map.
          </h1>
          <p>
            A shared collection of benchmarks, adaptation methods, and reported results. Reviewed by
            people. Versioned for research.
          </p>
          <div className="community-actions">
            <a className="button primary" href="#/submit">
              Submit a contribution <ArrowUpRight size={18} />
            </a>
            <a href="#/account/submissions" className="button secondary">
              My submissions
            </a>
          </div>
        </div>
        <div className="community-flow" aria-label="Contribution workflow">
          <span className="eyebrow">From contribution to discovery</span>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Submit</strong>
                <small>Share a protocol, method, or result.</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Review</strong>
                <small>Check versions, context, and evidence.</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Explore</strong>
                <small>Publish with a traceable version.</small>
              </div>
            </li>
          </ol>
        </div>
      </div>
      <ConnectionNotice />
      <div className="community-scope">
        <strong>Community collection</strong>
        <p>
          These contributions are separate from the <a href="#/results">paper’s original results</a>
          . “Reviewed” confirms a content review; it does not certify independent reproduction.
        </p>
      </div>
      <nav className="community-tabs" aria-label="Contribution types">
        {kinds.map((k) => {
          const Icon = icons[k]
          return (
            <a
              key={k}
              href={`#/community?kind=${k}`}
              aria-current={kind === k ? 'page' : undefined}
            >
              <Icon size={17} />
              {labels[k]}
            </a>
          )
        })}
      </nav>
      <form
        className="community-search-form"
        onSubmit={(e) => {
          e.preventDefault()
          setTerm(search)
          setPage(0)
        }}
      >
        <label className="sr-only" htmlFor="community-query">
          Search {labels[kind].toLowerCase()} by title
        </label>
        <input
          className="community-search"
          id="community-query"
          placeholder={`Search ${labels[kind].toLowerCase()} by title…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={160}
        />
        <button className="button secondary">Search</button>
      </form>
      {error ? (
        <div className="community-error" role="alert">
          {error}
          <button onClick={() => setTick((t) => t + 1)}>Retry</button>
        </div>
      ) : loading ? (
        <p role="status">Loading reviewed contributions…</p>
      ) : rows.length ? (
        <>
          <p className="community-count">
            {count} reviewed {labels[kind].toLowerCase()} · newest first
          </p>
          <div className="community-grid">
            {rows.map((r) => (
              <PublicationCard key={r.id} record={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="community-empty">
          <Database size={32} aria-hidden="true" />
          <h2>
            {term
              ? 'No matching contributions'
              : `The ${labels[kind].toLowerCase()} collection starts here.`}
          </h2>
          <p>
            {term
              ? 'Try another title or explore a different contribution type.'
              : client
                ? 'Approved contributions will appear here with their versions and evidence. Be among the first to contribute.'
                : 'The collection will open when the submission service is connected. You can already explore the contribution form.'}
          </p>
          <a className="button secondary" href={`#/submit?kind=${kind}`}>
            {client ? 'Contribute' : 'Explore the form'}
          </a>
        </div>
      )}
      <Pagination page={page} count={count} size={24} change={setPage} />
    </section>
  )
}
function PublicationCard({ record: r }: { record: Publication }) {
  return (
    <article className="community-card publication-card">
      <div className="community-actions">
        <span className="community-badge">{kindLabel[r.kind]}</span>
        <span className="community-badge">Reviewed</span>
      </div>
      <h2>
        <a href={publicationUrl(r.id)}>{r.title}</a>
      </h2>
      <p>{String(r.payload.summary)}</p>
      {r.kind === 'result' ? (
        <div className="publication-score">
          <strong>{String(r.payload.score)}</strong>
          <span>Reported score · protocol units</span>
        </div>
      ) : (
        <small>
          Version {String(r.payload.version)} · {String(r.payload.category || r.payload.family)}
        </small>
      )}
      <small>
        {String(r.payload.contributor)} · Published {new Date(r.published_at).toLocaleDateString()}
      </small>
      <a href={publicationUrl(r.id)} className="publication-open">
        Explore contribution <ArrowUpRight size={16} />
      </a>
    </article>
  )
}

export function PublicationDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<Publication | null>(null)
  const [versions, setVersions] = useState<Publication[]>([])
  const [references, setReferences] = useState<Publication[]>([])
  const [error, setError] = useState('')
  const { reviewer } = useAuth()
  useEffect(() => {
    if (!client) return
    let alive = true
    async function load() {
      const r = await client!.from('publications').select('*').eq('id', id).maybeSingle()
      if (r.error) throw r.error
      if (!r.data) throw Error('This contribution is unavailable. It may have been archived.')
      const value = r.data as Publication
      const v = await client!
        .from('publications')
        .select('*')
        .eq('entity_id', value.entity_id)
        .order('published_at', { ascending: false })
      if (v.error) throw v.error
      const ids = [value.benchmark_id, value.method_id].filter(Boolean) as string[]
      const refs = ids.length
        ? await client!.from('publications').select('*').in('id', ids)
        : { data: [], error: null }
      if (refs.error) throw refs.error
      if (alive) {
        setRecord(value)
        setVersions(v.data as Publication[])
        setReferences(refs.data as Publication[])
      }
    }
    load().catch((e) => {
      if (alive) setError(errorMessage(e))
    })
    return () => {
      alive = false
    }
  }, [id])
  if (!client)
    return (
      <section className="community-page">
        <ConnectionNotice />
        <a href="#/community">Back to Community</a>
      </section>
    )
  if (!record)
    return (
      <section className="community-page">
        <a href="#/community">← Community</a>
        <div className="community-notice" role="status">
          {error || 'Loading contribution…'}
        </div>
      </section>
    )
  return (
    <section className="community-page">
      <a href={`#/community?kind=${record.kind}`}>← {labels[record.kind]}</a>
      <div className="community-heading">
        <span className="eyebrow">Community · {kindLabel[record.kind]}</span>
        <h1>{record.title}</h1>
        <p>Reviewed · Published {new Date(record.published_at).toLocaleDateString()}</p>
      </div>
      {!record.is_current && (
        <div className="community-notice">
          You are viewing a historical version.{' '}
          {versions.find((v) => v.is_current) && (
            <a href={publicationUrl(versions.find((v) => v.is_current)!.id)}>
              View current version
            </a>
          )}
        </div>
      )}
      <div className="submission-layout">
        <div>
          <div className="community-card">
            <PayloadPreview kind={record.kind} payload={record.payload} />
          </div>
          {references.length > 0 && (
            <div className="community-card">
              <h2>Exact protocol and method versions</h2>
              {references.map((r) => (
                <p key={r.id}>
                  <a href={publicationUrl(r.id)}>
                    {kindLabel[r.kind]}: {r.title} · {String(r.payload.version)}
                  </a>
                </p>
              ))}
            </div>
          )}
        </div>
        <aside className="community-card submission-aside">
          <h2>Research context</h2>
          <p>
            This is a community contribution. Review does not imply that Aetherheart independently
            reproduced the reported result.
          </p>
          <small>Publication ID</small>
          <code className="publication-id">{record.id}</code>
          <h3>Version history</h3>
          <ol className="review-timeline">
            {versions.map((v) => (
              <li key={v.id}>
                <a href={publicationUrl(v.id)} aria-current={v.id === id ? 'page' : undefined}>
                  {String(v.payload.version || new Date(v.published_at).toLocaleDateString())}
                  {v.is_current ? ' · current' : ''}
                </a>
                <small>{new Date(v.published_at).toLocaleString()}</small>
              </li>
            ))}
          </ol>
          <a href="#/submit">Contribute your work →</a>
        </aside>
      </div>
      {record.kind === 'benchmark' && <ProtocolResults benchmark={record} />}
      {reviewer && (
        <AccessGate admin>
          <ArchivePublication record={record} />
        </AccessGate>
      )}
    </section>
  )
}

function ProtocolResults({ benchmark }: { benchmark: Publication }) {
  const [rows, setRows] = useState<Publication[]>([])
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setLoading(true)
    client!
      .from('publications')
      .select('*', { count: 'exact' })
      .eq('kind', 'result')
      .eq('benchmark_id', benchmark.id)
      .eq('is_current', true)
      .order('published_at', { ascending: false })
      .order('id')
      .range(page * 24, page * 24 + 23)
      .then(({ data, error, count }) => {
        if (alive) {
          setRows((data ?? []) as Publication[])
          setCount(count ?? 0)
          setError(error?.message ?? '')
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [benchmark.id, page])
  const present = (v: unknown) => v !== '' && v !== undefined && v !== null
  const scores = rows.flatMap((r) => [
    Number(r.payload.score),
    ...(present(r.payload.baseline) ? [Number(r.payload.baseline)] : []),
  ])
  const lo = present(benchmark.payload.minimum)
    ? Number(benchmark.payload.minimum)
    : Math.min(...scores, 0)
  const hi = present(benchmark.payload.maximum)
    ? Number(benchmark.payload.maximum)
    : Math.max(...scores, lo + 1)
  const pct = (v: unknown) => Math.max(0, Math.min(100, ((Number(v) - lo) / (hi - lo)) * 100))
  return (
    <section className="community-card protocol-results">
      <h2>Results on this protocol</h2>
      <p>
        Each row uses this exact benchmark version. Models, methods, and run settings may differ;
        review each contribution before comparing. Shown newest first, with no overall ranking.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p>Loading results…</p>
      ) : !rows.length ? (
        <p>No reviewed results for this protocol yet.</p>
      ) : (
        <>
          <div className="protocol-scale">
            <span>
              {lo} {String(benchmark.payload.unit)}
            </span>
            <span>
              {String(benchmark.payload.metric)} · {String(benchmark.payload.direction)} is better
            </span>
            <span>
              {hi} {String(benchmark.payload.unit)}
            </span>
          </div>
          <small>
            ● Reported score · ○ Matched baseline when supplied. Gains use the author’s matched
            baseline within that row.
          </small>
          {rows.map((r) => {
            const baseline = present(r.payload.baseline) && r.payload.baseline_matched === true
            const gain =
              (Number(r.payload.score) - Number(r.payload.baseline)) *
              (benchmark.payload.direction === 'lower' ? -1 : 1)
            return (
              <article className="protocol-row" key={r.id}>
                <div>
                  <h3>
                    <a href={publicationUrl(r.id)}>{r.title}</a>
                  </h3>
                  <small>
                    {String(r.payload.model)} · {String(r.payload.model_version)}
                  </small>
                  <small>
                    {String(r.payload.sample_count)} samples · {String(r.payload.repetitions)}{' '}
                    run(s) · {String(r.payload.aggregation)}
                  </small>
                </div>
                <div
                  className="protocol-track"
                  role="img"
                  aria-label={`Reported ${r.payload.score} ${benchmark.payload.unit}${baseline ? `; baseline ${r.payload.baseline}` : ''}`}
                >
                  <span className="protocol-axis" />
                  {baseline && (
                    <span
                      className="protocol-dot baseline"
                      style={{ left: `${pct(r.payload.baseline)}%` }}
                    />
                  )}
                  <span className="protocol-dot" style={{ left: `${pct(r.payload.score)}%` }} />
                </div>
                <div className="protocol-value">
                  <strong>
                    {String(r.payload.score)} {String(benchmark.payload.unit)}
                  </strong>
                  <small>
                    {baseline
                      ? `${gain > 0 ? '+' : ''}${Number(gain.toFixed(4))} improvement (${benchmark.payload.unit})`
                      : 'Baseline not reported'}
                  </small>
                  <small>
                    {present(r.payload.cost_usd)
                      ? `$${r.payload.cost_usd} · see cost scope`
                      : 'Cost unknown'}
                  </small>
                </div>
              </article>
            )
          })}
          <Pagination page={page} count={count} size={24} change={setPage} />
        </>
      )}
    </section>
  )
}
function ArchivePublication({ record }: { record: Publication }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <details className="community-card">
      <summary>Reviewer action: archive this contribution</summary>
      <p>
        Archiving removes all versions of this contribution and dependent results from public view.
        The review record is retained.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!confirm('Archive this contribution, all its versions, and dependent results?'))
            return
          setBusy(true)
          try {
            await rpc('archive_publication', { p_id: record.id, p_reason: reason })
            location.hash = '/community'
          } catch (e) {
            setError(errorMessage(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="community-field">
          Reason
          <textarea
            required
            minLength={3}
            maxLength={4000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button secondary" disabled={busy}>
          Archive contribution
        </button>
      </form>
    </details>
  )
}
