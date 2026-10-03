import { ArrowDownToLine, ArrowUpRight, Braces, FileText, GitFork } from 'lucide-react'
import { assetUrl, sourceUrl } from '../data'
import type { Study } from '../data'
import { Eyebrow, Note, PageIntro, PaperLink, SectionTitle } from '../components/UI'

export default function Paper({ data }: { data: Study }) {
  return (
    <>
      <PageIntro
        eyebrow="Paper & open research"
        title="Paper & resources"
        text="The paper, source repository, and the exact data snapshot behind this website."
      />
      <section className="paper-feature">
        <div className="paper-visual" aria-hidden="true">
          <div className="paper-sheet">
            <div className="paper-sheet-mark">FRACTURE</div>
            <h3>
              Can Adaptation
              <br />
              Substitute for
              <br />
              Model Scale?
            </h3>
            <div className="paper-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="paper-mini-chart">
              {[0.3, 0.56, 0.42, 0.9, 0.7, 0.84].map((v, i) => (
                <span key={i} style={{ height: `${v * 100}%` }} />
              ))}
            </div>
            <small>AN EMPIRICAL STUDY</small>
          </div>
        </div>
        <div className="paper-feature-copy">
          <Eyebrow>Research paper</Eyebrow>
          <h2>{data.paperTitle}</h2>
          <p>
            Fracture studies the extent to which task-specific adaptation can compensate for model
            scale, across generalization and discovery workloads.
          </p>
          <div className="paper-meta">
            <span>16 benchmarks</span>
            <span>5 adaptation strategies</span>
            <span>Snapshot {data.snapshotDate}</span>
          </div>
          <div className="paper-actions">
            <PaperLink />
            <a href={assetUrl('paper.pdf')} download="Fracture.pdf" className="button secondary">
              <ArrowDownToLine size={16} />
              Download PDF
            </a>
          </div>
        </div>
      </section>
      <section className="home-section">
        <SectionTitle
          number="01"
          title="Research resources"
          description="Follow the original artifacts or inspect the browser-ready snapshot."
        />
        <div className="resource-grid">
          <a className="resource-card" href={data.repository} target="_blank" rel="noreferrer">
            <GitFork size={24} />
            <h3>Research repository</h3>
            <p>Evaluation framework, adaptation recipes, experiment reports, and analysis.</p>
            <span>
              AetherHeart-AI / Fracture <ArrowUpRight size={15} />
            </span>
          </a>
          <a className="resource-card" href={assetUrl('data/study.json')} download>
            <Braces size={24} />
            <h3>Website data snapshot</h3>
            <p>
              Structured endpoints, controls, costs, and diagnostic aggregates with source hashes.
            </p>
            <span>
              Download study.json <ArrowDownToLine size={15} />
            </span>
          </a>
          <a
            className="resource-card"
            href={sourceUrl(data, data.sources.questions.path)}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={24} />
            <h3>Audited research questions</h3>
            <p>The source artifact for paired size-gap comparisons in the diagnostic explorer.</p>
            <span>
              Inspect audited data <ArrowUpRight size={15} />
            </span>
          </a>
        </div>
      </section>
      <section className="provenance-section">
        <SectionTitle
          number="02"
          title="A pinned, traceable snapshot"
          description="Every data source is tied to one research commit."
        />
        <div className="provenance-meta">
          <span>Commit</span>
          <a href={`${data.repository}/commit/${data.commit}`} target="_blank" rel="noreferrer">
            <code>{data.commit}</code>
            <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="source-list">
          {Object.entries(data.sources)
            .filter(([key]) => key !== 'paper')
            .map(([key, source]) => (
              <a key={key} href={sourceUrl(data, source.path)} target="_blank" rel="noreferrer">
                <div>
                  <b>
                    {key === 'paper' ? 'Paper PDF' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </b>
                  <span>{source.path}</span>
                  <code>SHA-256 · {source.sha256.slice(0, 16)}…</code>
                </div>
                <ArrowUpRight size={16} />
              </a>
            ))}
        </div>
        <Note>
          Data and the PDF are included with this site, so they remain readable without GitHub
          access. Original source and trace links may require repository permission. This first
          website snapshot does not live-sync new experiments.
        </Note>
      </section>
    </>
  )
}
