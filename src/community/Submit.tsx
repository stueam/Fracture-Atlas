import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, FileUp, Save } from 'lucide-react'
import { useAuth, ConnectionNotice } from './Auth'
import { client, errorMessage, rpc } from './client'
import { evidence, loadSubmission, publications } from './api'
import { emptyPayload, fieldsFor, parseImport, validate } from './fields'
import type { Field } from './fields'
import { kinds, kindLabel } from './types'
import type { Attachment, Kind, Payload, Publication, Submission } from './types'

const steps = ['Basics', 'Protocol & data', 'Evidence', 'Preview & submit']
function ReferenceSelect({
  kind,
  value,
  onChange,
}: {
  kind: 'benchmark' | 'method'
  value: string
  onChange: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Publication[]>([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  useEffect(() => {
    let alive = true
    publications(kind, search, page)
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
    return () => {
      alive = false
    }
  }, [kind, search, page])
  return (
    <div className="reference-picker">
      <input
        aria-label={`Search ${kind}s`}
        placeholder={`Search approved ${kind}s`}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
      />
      <select
        aria-label={`Approved ${kind} version`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a published version</option>
        {value && !rows.some((r) => r.id === value) && (
          <option value={value}>Selected version · {value.slice(0, 8)}</option>
        )}
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title} · {String(r.payload.version ?? '')} · {r.id.slice(0, 6)}
          </option>
        ))}
      </select>
      {count > 24 && (
        <div className="community-actions">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            type="button"
            disabled={(page + 1) * 24 >= count}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
      {error && <small role="alert">{error}</small>}
      <small>
        Only approved versions are selectable.{' '}
        <a href={`#/submit?kind=${kind}`}>Propose a new {kind}</a> first if it is missing.
      </small>
    </div>
  )
}
export function PayloadPreview({ kind, payload }: { kind: Kind; payload: Payload }) {
  return (
    <div className="payload-preview">
      <span className="community-badge">{kindLabel[kind]}</span>
      <h2>{String(payload.title || 'Untitled contribution')}</h2>
      <p>{String(payload.summary || 'Your summary will appear here.')}</p>
      <dl>
        {fieldsFor(kind)
          .filter(
            (f) =>
              !['title', 'summary', 'attestation'].includes(f.key) &&
              payload[f.key] !== undefined &&
              payload[f.key] !== '',
          )
          .map((f) => (
            <div key={f.key}>
              <dt>{f.label}</dt>
              <dd>
                {f.type === 'url' && /^https?:\/\//.test(String(payload[f.key])) ? (
                  <a href={String(payload[f.key])} target="_blank" rel="noreferrer">
                    {String(payload[f.key])}
                  </a>
                ) : typeof payload[f.key] === 'boolean' ? (
                  payload[f.key] ? (
                    'Yes'
                  ) : (
                    'No'
                  )
                ) : (
                  String(payload[f.key])
                )}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  )
}
export default function Submit({ id }: { id?: string }) {
  const { session, loading: authLoading } = useAuth()
  const requested = new URLSearchParams(location.hash.split('?')[1]).get('kind') as Kind
  const [kind, setKind] = useState<Kind>(kinds.includes(requested) ? requested : 'result')
  const [payload, setPayload] = useState<Payload>(emptyPayload)
  const [record, setRecord] = useState<Submission | null>(null)
  const [draftId] = useState(() => id || crypto.randomUUID())
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(!id)
  const [files, setFiles] = useState<Attachment[]>([])
  const [dirty, setDirty] = useState(false)
  const focusRef = useRef<HTMLHeadingElement>(null)
  const writable = (!record || record.status === 'draft') && loaded
  useEffect(() => {
    if (!id || !session) return
    let alive = true
    loadSubmission(id)
      .then(async (r) => {
        const f = await evidence(id)
        if (alive) {
          setRecord(r)
          setKind(r.kind)
          setPayload(r.payload)
          setFiles(f)
          setLoaded(true)
          setDirty(false)
        }
      })
      .catch((e) => {
        if (alive) setMessage(errorMessage(e))
      })
    return () => {
      alive = false
    }
  }, [id, session])
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.('a')
      if (
        dirty &&
        a &&
        a.getAttribute('href')?.startsWith('#') &&
        !window.confirm('Leave this form? Unsaved changes will be lost.')
      )
        e.preventDefault()
    }
    window.addEventListener('beforeunload', leave)
    document.addEventListener('click', click)
    return () => {
      window.removeEventListener('beforeunload', leave)
      document.removeEventListener('click', click)
    }
  }, [dirty])
  function update(key: string, value: string | boolean) {
    setPayload((p) => ({ ...p, [key]: value }))
    setDirty(true)
    setErrors((e) => {
      const next = { ...e }
      delete next[key]
      return next
    })
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await fn()
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function save() {
    const data = await rpc<Submission>('save_submission', {
      p_id: draftId,
      p_kind: kind,
      p_payload: payload,
      p_lock: record?.lock_version ?? 0,
      p_target: record?.target_id ?? null,
    })
    setRecord(data)
    setDirty(false)
    setMessage(`Saved to your account at ${new Date().toLocaleTimeString()}.`)
    return data
  }
  function checkStep(next: number) {
    const issues = validate(kind, payload)
    const fields = fieldsFor(kind).filter((f) => f.step === step)
    const current = Object.fromEntries(
      Object.entries(issues).filter(([key]) => fields.some((f) => f.key === key)),
    )
    setErrors(current)
    if (Object.keys(current).length) {
      focusRef.current?.focus()
      return
    }
    setStep(next)
    setTimeout(() => focusRef.current?.focus(), 0)
  }
  async function submit() {
    const issues = validate(kind, payload)
    setErrors(issues)
    if (Object.keys(issues).length) {
      const first = fieldsFor(kind).find((f) => issues[f.key])
      if (first) setStep(first.step)
      setMessage('Check the highlighted fields before submitting.')
      return
    }
    const saved = await save()
    const sent = await rpc<Submission>('submit_revision', {
      p_id: saved.id,
      p_lock: saved.lock_version,
    })
    setRecord(sent)
    setDirty(false)
    location.hash = `/submissions/${sent.id}`
  }
  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) throw Error('Each evidence file must be 10 MB or smaller.')
    const ext = file.name.split('.').pop()?.toLowerCase()
    const mime = (
      {
        pdf: 'application/pdf',
        json: 'application/json',
        csv: 'text/csv',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
      } as Record<string, string>
    )[ext ?? '']
    if (!mime) throw Error('Use PDF, JSON, CSV, PNG or JPEG.')
    const saved = await save()
    const a = await rpc<Attachment>('prepare_attachment', {
      p_submission: saved.id,
      p_filename: file.name,
      p_size: file.size,
      p_mime: mime,
    })
    try {
      const { error } = await client!.storage
        .from('submission-evidence')
        .upload(a.object_path, file, { contentType: mime, upsert: false })
      if (error) throw error
      const result = await client!.functions.invoke('validate-evidence', {
        body: { attachment_id: a.id },
      })
      if (result.error) throw result.error
      if (!result.data?.valid)
        throw Error('File validation failed. Remove this attachment and upload a valid file.')
      setMessage('Evidence uploaded privately. It is not publicly downloadable.')
    } finally {
      setFiles(await evidence(saved.id))
    }
  }
  function renderField(f: Field) {
    const value = payload[f.key] ?? ''
    const error = errors[f.key]
    return (
      <div className={`community-field ${error ? 'has-error' : ''}`} key={f.key}>
        <label htmlFor={`field-${f.key}`}>
          {f.label}
          {f.required && f.type !== 'checkbox' ? ' *' : ''}
        </label>
        {f.key === 'benchmark_id' || f.key === 'method_id' ? (
          <ReferenceSelect
            kind={f.key === 'benchmark_id' ? 'benchmark' : 'method'}
            value={String(value)}
            onChange={(v) => update(f.key, v)}
          />
        ) : f.type === 'textarea' ? (
          <textarea
            id={`field-${f.key}`}
            rows={4}
            value={String(value)}
            maxLength={6000}
            onChange={(e) => update(f.key, e.target.value)}
            aria-invalid={!!error}
          />
        ) : f.type === 'select' ? (
          <select
            id={`field-${f.key}`}
            value={String(value)}
            onChange={(e) => update(f.key, e.target.value)}
          >
            <option value="">Choose…</option>
            {f.options?.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ) : f.type === 'checkbox' ? (
          <input
            id={`field-${f.key}`}
            type="checkbox"
            checked={value === true}
            onChange={(e) => update(f.key, e.target.checked)}
          />
        ) : (
          <input
            id={`field-${f.key}`}
            type={f.type ?? 'text'}
            step={f.type === 'number' ? 'any' : undefined}
            value={String(value)}
            maxLength={f.key === 'title' ? 160 : 2000}
            onChange={(e) => update(f.key, e.target.value)}
            aria-invalid={!!error}
          />
        )}
        {f.help && <small>{f.help}</small>}
        {error && <small className="field-error">{error}</small>}
      </div>
    )
  }
  return (
    <section className="community-page">
      <div className="community-heading">
        <span className="eyebrow">Contribute to the atlas</span>
        <h1>{id ? 'Edit contribution' : 'Submit a contribution'}</h1>
        <p>
          Share a benchmark, an optimization method, or an experiment. Every submission is reviewed
          before publication.
        </p>
      </div>
      <ConnectionNotice />
      {!session && client && !authLoading && (
        <div className="community-notice">
          <a href="#/account?next=/submit">Sign in with GitHub</a> to save and submit. You can
          explore the form first.
        </div>
      )}
      <div className="contribution-kinds">
        {kinds.map((k) => (
          <button
            key={k}
            disabled={!!record || !!id || busy}
            className={kind === k ? 'selected' : ''}
            onClick={() => {
              setKind(k)
              setPayload(emptyPayload())
              setStep(0)
              setErrors({})
              setDirty(false)
            }}
          >
            <span>{kindLabel[k]}</span>
            <small>
              {k === 'result'
                ? 'Scores, costs & evidence'
                : k === 'benchmark'
                  ? 'Datasets & evaluation protocols'
                  : 'Recipes, configurations & code'}
            </small>
          </button>
        ))}
      </div>
      <ol className="submission-steps">
        {steps.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button
              type="button"
              onClick={() => (i < step ? setStep(i) : i === step ? undefined : checkStep(i))}
              disabled={busy}
            >
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {message && (
        <div className="community-notice" role="status">
          {message}
        </div>
      )}
      {!loaded && (
        <p role="status">{session ? 'Loading saved draft…' : 'Sign in to load this draft.'}</p>
      )}
      {record && record.status !== 'draft' && (
        <div className="community-notice">
          This revision is locked. <a href={`#/submissions/${record.id}`}>View its review status</a>
          .
        </div>
      )}
      <div className="submission-layout">
        <form
          className="community-card"
          onSubmit={(e) => {
            e.preventDefault()
            if (step < 3) checkStep(step + 1)
            else run(submit)
          }}
        >
          <h2 ref={focusRef} tabIndex={-1}>
            {steps[step]}
          </h2>
          <fieldset disabled={busy || !writable}>
            {step === 0 && (
              <div className="import-tools">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const template = Object.fromEntries(
                      fieldsFor(kind).map((f) => [f.key, f.type === 'checkbox' ? false : '']),
                    )
                    const blob = new Blob(
                      [JSON.stringify({ schema_version: 1, ...template }, null, 2)],
                      { type: 'application/json' },
                    )
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${kind}-template.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Download JSON template
                </button>
                <label className="button secondary">
                  <FileUp size={16} />
                  Import JSON / CSV
                  <input
                    className="file-input"
                    type="file"
                    accept=".json,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file)
                        run(async () => {
                          setPayload(
                            parseImport(
                              await file.text(),
                              file.name.endsWith('.csv') ? 'csv' : 'json',
                              kind,
                            ),
                          )
                          setDirty(true)
                          setMessage('Imported locally. Review the fields and save your draft.')
                        })
                    }}
                  />
                </label>
                <small>One aggregate record per import. Attach per-run logs as evidence.</small>
              </div>
            )}
            {step === 3 && <PayloadPreview kind={kind} payload={payload} />}
            {fieldsFor(kind)
              .filter((f) => f.step === step)
              .map(renderField)}
            {step === 2 && (
              <div className="evidence-upload">
                <h3>Private supporting evidence</h3>
                <p>
                  PDF, JSON, CSV, PNG or JPEG. Up to 5 files, 10 MB each and 25 MB total. Evidence
                  remains private to you and reviewers.
                </p>
                <input
                  aria-label="Upload private evidence"
                  type="file"
                  accept=".pdf,.json,.csv,.png,.jpg,.jpeg"
                  disabled={!client || !session}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) run(() => upload(file))
                  }}
                />
                {files
                  .filter((f) => f.revision === (record?.revision ?? 1))
                  .map((f) => (
                    <div className="attachment-row" key={f.id}>
                      <span>
                        {f.filename} · {f.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          run(async () => {
                            await rpc('remove_pending_attachment', { p_id: f.id })
                            setFiles(await evidence(draftId))
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </fieldset>
          <div className="community-actions">
            <button
              type="button"
              className="button secondary"
              disabled={busy || !client || !session || !writable}
              onClick={() =>
                run(async () => {
                  await save()
                })
              }
            >
              <Save size={16} />
              {dirty ? 'Save draft' : 'Save'}
            </button>
            {step > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            <button
              className="button primary"
              disabled={busy || !writable || (step === 3 && (!client || !session))}
            >
              {busy ? 'Working…' : step === 3 ? 'Submit for review' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
          <small>
            {dirty ? 'Unsaved changes' : record ? 'Cloud draft saved' : 'Form preview · not saved'}
          </small>
        </form>
        <aside className="community-card submission-aside">
          <span className="eyebrow">Before you submit</span>
          <h2>Evidence first.</h2>
          <p>
            Use exact versions and report the evaluation conditions. Missing costs stay unknown;
            different protocols are not ranked together.
          </p>
          <div className="review-promise">
            <Check size={18} />
            <span>Private until approved</span>
          </div>
          <div className="review-promise">
            <Check size={18} />
            <span>Feedback and revision history</span>
          </div>
          <div className="review-promise">
            <Check size={18} />
            <span>Reviewed does not mean reproduced</span>
          </div>
          <hr />
          <p>
            After submission, this revision is locked. If reviewers request changes, you can create
            a new revision.
          </p>
          <a href="#/account/submissions">View my submissions →</a>
        </aside>
      </div>
    </section>
  )
}
