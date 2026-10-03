import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth, ConnectionNotice } from './Auth'
import { client, errorMessage, rpc } from './client'
import { downloadEvidence, evidence, events, loadSubmission } from './api'
import type { Attachment, Payload, ReviewEvent, Submission } from './types'
import { kindLabel, statusLabel } from './types'
import { PayloadPreview } from './Submit'

export function AccessGate({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { session, loading, reviewer } = useAuth()
  const [aal, setAal] = useState('')
  useEffect(() => {
    if (session && client)
      client.auth.mfa
        .getAuthenticatorAssuranceLevel()
        .then(({ data }) => setAal(data?.currentLevel ?? ''))
  }, [session])
  if (!client)
    return (
      <>
        <ConnectionNotice />
        <a className="button secondary" href="#/submit">
          Explore the submission form
        </a>
      </>
    )
  if (loading) return <p>Loading account…</p>
  if (!session)
    return (
      <div className="community-card">
        <h2>Sign in to continue</h2>
        <a
          className="button primary"
          href={`#/account?next=${encodeURIComponent(location.hash.slice(1))}`}
        >
          Sign in with GitHub
        </a>
      </div>
    )
  if (admin && !reviewer)
    return (
      <div className="community-notice">
        This area is available to authorized reviewers. <a href="#/account">Open account</a>
      </div>
    )
  if (admin && aal !== 'aal2')
    return (
      <div className="community-notice">
        Verify your authenticator before accessing private review material.{' '}
        <a href="#/account/security">Verify account</a>
      </div>
    )
  return <>{children}</>
}
export function SubmissionList({ admin = false }: { admin?: boolean }) {
  return (
    <section className="community-page">
      <div className="community-heading">
        <span className="eyebrow">{admin ? 'Reviewer workspace' : 'Your contributions'}</span>
        <h1>{admin ? 'Review queue' : 'My submissions'}</h1>
        <p>
          {admin
            ? 'Review evidence, compare revisions, and publish approved contributions.'
            : 'Track drafts, feedback, and published versions.'}
        </p>
      </div>
      <AccessGate admin={admin}>
        <SubmissionRows admin={admin} />
      </AccessGate>
    </section>
  )
}
function SubmissionRows({ admin }: { admin: boolean }) {
  const { session } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  const [filter, setFilter] = useState(admin ? 'submitted' : 'all')
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    let q = client!
      .from('submissions')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .order('id')
      .range(page * 20, page * 20 + 19)
    if (!admin) q = q.eq('owner_id', session!.user.id)
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data, error, count }) => {
      if (alive) {
        setError(error?.message ?? '')
        setRows((data ?? []) as Submission[])
        setCount(count ?? 0)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [admin, session, filter, page, tick])
  return (
    <>
      <div className="community-actions">
        <label>
          Status{' '}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" onClick={() => setTick((t) => t + 1)}>
          Refresh
        </button>
        {!admin && (
          <a href="#/submit" className="button primary">
            New contribution
          </a>
        )}
      </div>
      {error && (
        <div role="alert" className="community-error">
          {error}
        </div>
      )}
      {loading ? (
        <p>Loading submissions…</p>
      ) : rows.length ? (
        <div className="community-list">
          {rows.map((r) => (
            <article className="community-card" key={r.id}>
              <span className="community-badge">
                {statusLabel[r.status]} · {kindLabel[r.kind]}
              </span>
              <h2>
                <a href={`#/${admin ? 'admin/reviews' : 'submissions'}/${r.id}`}>
                  {String(r.payload.title || 'Untitled draft')}
                </a>
              </h2>
              <small>
                Revision {r.revision} · Updated {new Date(r.updated_at).toLocaleString()}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="community-empty">
          <h2>{admin ? 'No submissions in this queue' : 'No contributions yet'}</h2>
          <p>
            {admin
              ? 'New submissions will appear here when authors send them for review.'
              : 'Start with a benchmark, method, or experiment result.'}
          </p>
        </div>
      )}
      <Pagination page={page} count={count} size={20} change={setPage} />
    </>
  )
}
export function Pagination({
  page,
  count,
  size,
  change,
}: {
  page: number
  count: number
  size: number
  change: (n: number) => void
}) {
  if (count <= size) return null
  return (
    <div className="community-actions">
      <button className="button secondary" disabled={!page} onClick={() => change(page - 1)}>
        Previous
      </button>
      <span>
        {page * size + 1}–{Math.min(count, (page + 1) * size)} of {count}
      </span>
      <button
        className="button secondary"
        disabled={(page + 1) * size >= count}
        onClick={() => change(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
export function SubmissionDetail({ id, admin = false }: { id: string; admin?: boolean }) {
  return (
    <section className="community-page">
      <AccessGate admin={admin}>
        <Detail id={id} admin={admin} />
      </AccessGate>
    </section>
  )
}
function Detail({ id, admin }: { id: string; admin: boolean }) {
  const { session } = useAuth()
  const [record, setRecord] = useState<Submission | null>(null)
  const [files, setFiles] = useState<Attachment[]>([])
  const [history, setHistory] = useState<ReviewEvent[]>([])
  const [previous, setPrevious] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState('')
  const [decision, setDecision] = useState('request_changes')
  const [notes, setNotes] = useState<{ message: string; created_at: string }[]>([])
  async function refresh() {
    const r = await loadSubmission(id)
    const [f, h] = await Promise.all([evidence(id), events(id)])
    setRecord(r)
    setFiles(f)
    setHistory(h)
    const old = await client!
      .from('submission_revisions')
      .select('payload')
      .eq('submission_id', id)
      .lt('revision', r.revision)
      .order('revision', { ascending: false })
      .limit(1)
    if (old.error) throw Error(old.error.message)
    setPrevious(old.data?.[0]?.payload ?? null)
    if (admin) {
      const n = await client!
        .from('review_notes')
        .select('message,created_at')
        .eq('submission_id', id)
        .order('created_at')
      if (n.error) throw Error(n.error.message)
      setNotes(n.data ?? [])
    }
  }
  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)))
  }, [id])
  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (!record)
    return (
      <div className="community-card">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => run(async () => {})}>Retry</button>
          </>
        ) : (
          <p>Loading contribution…</p>
        )}
      </div>
    )
  const own = record.owner_id === session!.user.id
  const assigned = record.reviewer_id === session!.user.id
  return (
    <>
      <a href={admin ? '#/admin/reviews' : '#/account/submissions'}>
        ← {admin ? 'Review queue' : 'My submissions'}
      </a>
      <div className="community-heading">
        <h1>{String(record.payload.title || 'Untitled contribution')}</h1>
        <p>
          <span className="community-badge">{statusLabel[record.status]}</span> Revision{' '}
          {record.revision}
        </p>
      </div>
      {error && (
        <div className="community-error" role="alert">
          {error}
        </div>
      )}
      <div className="community-actions">
        {own && record.status === 'draft' && (
          <a href={`#/submissions/${id}/edit`} className="button primary">
            Continue editing
          </a>
        )}
        {own && ['changes_requested', 'withdrawn'].includes(record.status) && (
          <button
            disabled={busy}
            className="button primary"
            onClick={() =>
              run(async () => {
                await rpc('revise_submission', { p_id: id })
                location.hash = `/submissions/${id}/edit`
              })
            }
          >
            Create revised draft
          </button>
        )}
        {own && ['submitted', 'in_review'].includes(record.status) && (
          <button
            disabled={busy}
            className="button secondary"
            onClick={() => run(() => rpc('withdraw_submission', { p_id: id }))}
          >
            Withdraw from review
          </button>
        )}
        {own && record.status === 'published' && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { data, error } = await client!
                  .from('publications')
                  .select('*')
                  .eq('submission_id', id)
                  .single()
                if (error) throw error
                if (!data.is_current)
                  throw Error(
                    'This version has been superseded. Open the current publication first.',
                  )
                const newId = crypto.randomUUID()
                await rpc('save_submission', {
                  p_id: newId,
                  p_kind: record.kind,
                  p_payload: { ...record.payload, attestation: false },
                  p_lock: 0,
                  p_target: data.id,
                })
                location.hash = `/submissions/${newId}/edit`
              })
            }
          >
            Propose an updated version
          </button>
        )}
      </div>
      <div className="submission-layout">
        <div>
          <div className="community-card">
            <PayloadPreview kind={record.kind} payload={record.payload} />
          </div>
          {previous && (
            <div className="community-card review-diff">
              <h2>Changes from prior revision</h2>
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Previous</th>
                    <th>Current</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set([...Object.keys(previous), ...Object.keys(record.payload)])]
                    .filter((k) => previous[k] !== record.payload[k])
                    .map((k) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{String(previous[k] ?? '—')}</td>
                        <td>{String(record.payload[k] ?? '—')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="community-card">
            <h2>Private evidence</h2>
            <p>
              Evidence files are untrusted downloads. They are not published or rendered inline.
            </p>
            {files.length ? (
              files.map((f) => (
                <div className="attachment-row" key={f.id}>
                  <span>
                    {f.filename}
                    <small>
                      Revision {f.revision} · {f.status} · {Math.ceil(f.byte_size / 1024)} KB
                    </small>
                  </span>
                  <button
                    className="button secondary"
                    disabled={busy || f.status !== 'ready'}
                    onClick={() => run(() => downloadEvidence(f))}
                  >
                    Download
                  </button>
                </div>
              ))
            ) : (
              <p>No private attachments.</p>
            )}
          </div>
          <div className="community-card">
            <h2>Review history</h2>
            {history.length ? (
              <ol className="review-timeline">
                {history.map((e) => (
                  <li key={e.id}>
                    <strong>
                      {e.action.replaceAll('_', ' ')} · revision {e.revision}
                    </strong>
                    <small>{new Date(e.created_at).toLocaleString()}</small>
                    {e.message && <p>{e.message}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p>This draft has not been submitted.</p>
            )}
          </div>
        </div>
        <aside className="community-card submission-aside">
          <h2>{admin ? 'Review decision' : 'What happens next'}</h2>
          {admin ? (
            <>
              {own ? (
                <p>You cannot review your own contribution.</p>
              ) : record.status === 'submitted' ? (
                <button
                  disabled={busy}
                  className="button primary"
                  onClick={() => run(() => rpc('claim_review', { p_id: id }))}
                >
                  Claim this review
                </button>
              ) : record.status === 'in_review' && assigned ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    run(async () => {
                      await rpc('decide_submission', {
                        p_id: id,
                        p_lock: record.lock_version,
                        p_decision: decision,
                        p_message: message,
                        p_internal: internal,
                      })
                      setMessage('')
                      setInternal('')
                    })
                  }}
                >
                  <p>
                    Check source versions, metric definitions, evidence and evaluation conditions.
                    Approval means reviewed, not reproduced.
                  </p>
                  <label className="community-field">
                    Decision
                    <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                      <option value="request_changes">Request changes</option>
                      <option value="approve">Approve and publish</option>
                      <option value="reject">Reject</option>
                    </select>
                  </label>
                  <label className="community-field">
                    Feedback to the author
                    <textarea
                      required
                      minLength={3}
                      maxLength={4000}
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </label>
                  <label className="community-field">
                    Internal note (reviewers only)
                    <textarea
                      maxLength={4000}
                      rows={3}
                      value={internal}
                      onChange={(e) => setInternal(e.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    {busy ? 'Saving…' : 'Save decision'}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || message.trim().length < 3}
                    onClick={() =>
                      run(() => rpc('release_review', { p_id: id, p_reason: message }))
                    }
                  >
                    Release review with this reason
                  </button>
                </form>
              ) : (
                <p>
                  {record.status === 'in_review'
                    ? 'Another reviewer has claimed this submission.'
                    : 'This submission is not awaiting a decision.'}
                </p>
              )}
              {notes.length > 0 && (
                <>
                  <h3>Internal notes</h3>
                  {notes.map((n, i) => (
                    <p key={i}>{n.message}</p>
                  ))}
                </>
              )}
              {!own && !assigned && record.status === 'in_review' && (
                <details>
                  <summary>Recover a review after role revocation</summary>
                  <p>This works only if the assigned reviewer no longer has review access.</p>
                  <label className="community-field">
                    Reason
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={4000}
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={busy || message.trim().length < 3}
                    onClick={() =>
                      run(() => rpc('release_review', { p_id: id, p_reason: message }))
                    }
                  >
                    Return to queue
                  </button>
                </details>
              )}
            </>
          ) : (
            <>
              <p>
                Submitted revisions are locked. Reviewers will approve the contribution, request a
                revision, or explain why it cannot be accepted.
              </p>
              <p>
                Check this page for feedback. Published updates keep their earlier versions
                available.
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  )
}
