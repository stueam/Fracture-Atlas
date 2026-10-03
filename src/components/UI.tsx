import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import ThemeToggle from './ThemeToggle'
import { communityEnabled } from '../community/config'
import MethodSymbol from './MethodSymbol'
import { ArrowUpRight, Check, ChevronDown, FileText, Info, X } from 'lucide-react'
import {
  MODELS,
  METHOD_NAMES,
  assetUrl,
  allocation,
  dollars,
  matchedFor,
  metricValue,
  sourceUrl,
} from '../data'
import type { CostRecord, MethodRecord, Study } from '../data'

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a className={`brand ${small ? 'small' : ''}`} href="#/" aria-label="Fracture Atlas home">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
        <rect width="40" height="40" rx="9" fill="currentColor" />
        <path d="M11 11h18v7H18v11h-7z" fill="var(--paper)" />
        <path d="M22 22h7v7h-7z" fill="var(--accent)" />
      </svg>
      <span>
        Fracture<span className="brand-light"> Atlas</span>
      </span>
    </a>
  )
}

export function Header({ path }: { path: string }) {
  const paperItems = [
    ['/', 'Overview'],
    ['/results', 'Results'],
    ['/benchmarks', 'Benchmarks'],
    ['/costs', 'Costs'],
    ['/diagnostics', 'Diagnostics'],
    ['/paper', 'Paper & resources'],
  ]
  const items = communityEnabled
    ? [
        ['/community', 'Community'],
        ['/paper', 'Paper & resources'],
        ['/submit', 'Submit'],
        ['/account', 'Account'],
      ]
    : paperItems.slice(1)
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={path === '/' ? 'page' : undefined}>
            Overview
          </a>
          {communityEnabled && (
            <details className="explore-menu">
              <summary>Explore</summary>
              <div>
                {paperItems.slice(1, 5).map(([url, label]) => (
                  <a
                    key={url}
                    href={`#${url}`}
                    onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </details>
          )}
          {items.map(([url, label]) => (
            <a
              key={url}
              href={`#${url}`}
              aria-current={
                (url === '/' ? path === '/' : path.startsWith(url)) ? 'page' : undefined
              }
            >
              {label}
            </a>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}

export function Footer({ data }: { data?: Study }) {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Logo small />
        <p>
          A map of what adaptation can change.
          <br />
          <span className="footer-company">
            <span lang="zh-CN">以太之心</span> Aetherheart
          </span>
        </p>
      </div>
      <div className="footer-bottom">
        <span>
          {data ? (
            <>
              Paper snapshot · {data.snapshotDate} · <code>{data.commit.slice(0, 7)}</code>
            </>
          ) : (
            'Aetherheart · Research & community'
          )}
        </span>
        <span>Fracture Atlas · v0.1</span>
      </div>
    </footer>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span className="eyebrow-line" />
      {children}
    </div>
  )
}
export function PageIntro({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="page-intro">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  )
}
export function ModelSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="select-field">
      <span>Model</span>
      <div className="select-wrap">
        <select aria-label="Model" value={value} onChange={(e) => onChange(e.target.value)}>
          {MODELS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <ChevronDown size={14} />
      </div>
    </label>
  )
}
export function Note({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`note ${compact ? 'compact' : ''}`}>
      <Info size={16} />
      <div>{children}</div>
    </div>
  )
}
export function MethodTag({ method }: { method: string }) {
  return (
    <span className="method-tag" title={METHOD_NAMES[method]}>
      <svg viewBox="-10 -10 20 20" width="14" height="14" aria-hidden="true">
        <MethodSymbol method={method} />
      </svg>
      {method}
    </span>
  )
}
export function SectionTitle({
  number,
  title,
  description,
  action,
}: {
  number: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-title">
      <div>
        <span className="section-number">{number} /</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function PaperLink({ className = 'button primary' }: { className?: string }) {
  return (
    <a className={className} href={assetUrl('paper.pdf')} target="_blank" rel="noreferrer">
      <FileText size={16} />
      Open paper (PDF)
      <ArrowUpRight size={16} />
    </a>
  )
}

export type Inspection =
  | { kind: 'method'; record: MethodRecord }
  | { kind: 'cost'; record: CostRecord }
export function RecordDrawer({
  data,
  inspection,
  close,
}: {
  data: Study
  inspection: Inspection
  close: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const elements = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, [tabindex="0"]',
        )
        if (!elements?.length) return
        const first = elements[0],
          last = elements[elements.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [close])
  const r = inspection.record
  const pair = inspection.kind === 'method' ? matchedFor(data, inspection.record) : undefined
  const sourcePath =
    inspection.kind === 'method' ? 'docs/reports/results.md' : inspection.record.source.file
  const sourceLine =
    inspection.kind === 'method'
      ? inspection.record.source?.source_line
      : inspection.record.source.lines?.[0]
  const trace =
    inspection.kind === 'method' ? inspection.record.source?.trace : inspection.record.trace
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={panelRef}
      >
        <div className="drawer-top">
          <Eyebrow>Experiment record</Eyebrow>
          <button ref={closeRef} className="icon-button" aria-label="Close record" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <h2 id="drawer-title">{r.benchmark}</h2>
        <div className="drawer-subtitle">
          <MethodTag method={r.method} />
          <span>{r.model}</span>
        </div>
        <div className="record-score">
          <span>Reported endpoint</span>
          <strong>{metricValue(r.value, r.benchmark)}</strong>
          <small>
            {r.benchmark.includes('Packing') ||
            r.benchmark === 'REI' ||
            r.benchmark.includes('Overlap')
              ? 'Task-native quality'
              : 'Benchmark score (%)'}
          </small>
        </div>
        {inspection.kind === 'method' && (
          <>
            <dl className="record-list">
              <div>
                <dt>Recipe</dt>
                <dd>{inspection.record.source?.recipe || 'Not reported'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {inspection.record.exclusion
                    ? `Excluded: ${inspection.record.exclusion}`
                    : r.value === null
                      ? 'Not reported'
                      : 'Reported'}
                </dd>
              </div>
            </dl>
            {pair ? (
              <div className="matched-box">
                <Check size={16} />
                <div>
                  <b>Matched control available</b>
                  <p>
                    Control {metricValue(pair.value, r.benchmark)} → endpoint{' '}
                    {metricValue(pair.endpoint, r.benchmark)}
                  </p>
                  <a
                    href={sourceUrl(data, pair.source, pair.source_line)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Control provenance <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            ) : (
              <Note compact>
                A compatible matched control is not linked to this endpoint. Treat it as a reported
                result.
              </Note>
            )}
          </>
        )}
        {inspection.kind === 'cost' && (
          <>
            <dl className="record-list">
              <div>
                <dt>Recorded total</dt>
                <dd>{dollars(inspection.record.total_cost_usd)}</dd>
              </div>
              <div>
                <dt>Accounting</dt>
                <dd>{inspection.record.cost_status}</dd>
              </div>
              <div>
                <dt>Adaptation allocation</dt>
                <dd>{allocation(inspection.record)}</dd>
              </div>
            </dl>
            <h3>Recorded components</h3>
            <div className="cost-components">
              {inspection.record.components.map((c) => (
                <div key={c.key}>
                  <div>
                    <span>{c.label}</span>
                    <b>{dollars(c.cost_usd)}</b>
                  </div>
                  <p>{c.accounting}</p>
                </div>
              ))}
            </div>
            {inspection.record.notes.map((n, i) => (
              <Note compact key={i}>
                {n.message}
              </Note>
            ))}
          </>
        )}
        <h3>Source & provenance</h3>
        <p className="muted small-text">
          Pinned to research commit {data.commit.slice(0, 7)}. Source links require access to the
          research repository.
        </p>
        <a
          className="source-card"
          href={sourceUrl(data, sourcePath, sourceLine)}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            {sourcePath}
            <small>{sourceLine ? `Line ${sourceLine}` : 'Source artifact'}</small>
          </span>
          <ArrowUpRight size={16} />
        </a>
        {trace && (
          <a className="source-card" href={sourceUrl(data, trace)} target="_blank" rel="noreferrer">
            <span>
              {trace}
              <small>Experiment trace path</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
        )}
      </aside>
    </div>
  )
}
