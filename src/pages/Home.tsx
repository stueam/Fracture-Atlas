import { useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Fingerprint, Layers3, MoveUpRight } from 'lucide-react'
import { BENCHMARKS, MODELS, METHOD_NAMES, overviewFor, metricValue, assetUrl } from '../data'
import type { Study } from '../data'
import { Eyebrow, Note, PaperLink, SectionTitle } from '../components/UI'

function CapabilityPlot({ data, model }: { data: Study; model: string }) {
  const tasks = ['LiveMath', 'FinQA', 'Spider', 'IFEval']
  const width = 560,
    left = 102,
    right = 516
  const x = (v: number) => left + (v / 100) * (right - left)
  return (
    <svg
      className="capability-plot"
      viewBox={`0 0 ${width} 280`}
      role="img"
      aria-label={`Reported baseline and best tested endpoints for ${model} on four tasks. These endpoints can use different evaluation protocols.`}
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={x(v)}
            x2={x(v)}
            y1="26"
            y2="230"
            stroke="#e3e5de"
            strokeDasharray={v === 0 ? undefined : '3 5'}
          />
          <text x={x(v)} y="254" textAnchor="middle" className="plot-tick">
            {v}
          </text>
        </g>
      ))}
      {tasks.map((task, i) => {
        const r = overviewFor(data, task, model)!,
          y = 56 + i * 51
        return (
          <g key={task}>
            <text x="0" y={y + 4} className="plot-label">
              {task}
            </text>
            <line
              x1={left}
              x2={right}
              y1={y}
              y2={y}
              stroke="#eceee6"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {r.baseline !== null && (
              <circle
                cx={x(r.baseline)}
                cy={y}
                r="5"
                fill="#fff"
                stroke="#788477"
                strokeWidth="2"
              />
            )}
            <circle cx={x(r.top ?? 0)} cy={y} r="7" fill="#d46845" />
            <text x={Math.min(x(r.top ?? 0) + 12, 547)} y={y + 4} className="plot-value">
              {metricValue(r.top, task)}
            </text>
          </g>
        )
      })}
      <text x={right} y="278" textAnchor="end" className="plot-axis">
        Reported score (%)
      </text>
    </svg>
  )
}

export default function Home({ data }: { data: Study }) {
  const [model, setModel] = useState<string>(MODELS[0])
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <span />
            An empirical map of model adaptation
          </div>
          <h1>
            Can adaptation
            <br />
            substitute for
            <br />
            <em>model scale?</em>
          </h1>
          <p>
            Explore where smaller language models close capability gaps — and where the gaps remain.
            Sixteen benchmarks. Five strategies. Every result in context.
          </p>
          <div className="hero-actions">
            <a href="#/results" className="button primary">
              Explore the results <ArrowUpRight size={17} />
            </a>
            <PaperLink className="button secondary" />
          </div>
          <div className="hero-footnote">
            <Fingerprint size={15} />
            <span>Evidence from Fracture · Paper snapshot {data.snapshotDate}</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="plot-card">
            <div className="plot-card-head">
              <div>
                <span className="tiny-label">CAPABILITY SNAPSHOT</span>
                <h2>Different tasks. Different limits.</h2>
              </div>
              <span className="live-tag">
                <span />
                Real experiment data
              </span>
            </div>
            <div className="model-tabs" role="group" aria-label="Snapshot model">
              {MODELS.slice(0, 2).map((m) => (
                <button key={m} onClick={() => setModel(m)} className={model === m ? 'active' : ''}>
                  {m}
                </button>
              ))}
            </div>
            <CapabilityPlot data={data} model={model} />
            <div className="plot-legend">
              <span>
                <i className="legend-ring" />
                Reported baseline
              </span>
              <span>
                <i className="legend-dot" />
                Best tested endpoint
              </span>
            </div>
            <div className="plot-disclosure">
              Descriptive endpoints; protocols may differ. Explore matched controls to measure
              adaptation gain.
            </div>
          </div>
          <div className="visual-note">
            <span className="note-index">01</span>
            <span>
              The answer depends on
              <br />
              <b>the task, the method, and the protocol.</b>
            </span>
            <MoveUpRight size={21} />
          </div>
        </div>
      </section>
      <div className="stat-strip">
        <div>
          <strong>
            16<span>benchmarks</span>
          </strong>
          <p>13 generalization · 3 discovery</p>
        </div>
        <div>
          <strong>
            5<span>adaptation strategies</span>
          </strong>
          <p>ICL · SkillOpt · SFT · RL · TTT</p>
        </div>
        <div>
          <strong>
            3<span>target model versions</span>
          </strong>
          <p>8B and 27B Qwen variants</p>
        </div>
        <div>
          <strong>
            2<span>frontier references</span>
          </strong>
          <p>Kimi K3 · DS v4 Pro</p>
        </div>
      </div>
      <section className="home-section">
        <SectionTitle
          number="01"
          title="A research question, not a single ranking."
          description="Compare the evidence at the level where it was measured."
        />
        <div className="finding-grid">
          <a href="#/results" className="finding-card">
            <div className="finding-icon">
              <Layers3 size={21} />
            </div>
            <h3>Adaptation is task-dependent.</h3>
            <p>
              Explore reported endpoints across methods and models. Switch to matched controls when
              asking how much a method improved a model.
            </p>
            <span>
              Browse the evidence <ArrowRight size={15} />
            </span>
          </a>
          <a href="#/diagnostics" className="finding-card">
            <div className="finding-icon">
              <Fingerprint size={21} />
            </div>
            <h3>The evaluator changes the story.</h3>
            <p>
              Inspect numerical scaling failures and paired controls. Separate post-hoc diagnostic
              replay from held-out adaptation results.
            </p>
            <span>
              Inspect diagnostics <ArrowRight size={15} />
            </span>
          </a>
          <a href="#/costs" className="finding-card">
            <div className="finding-icon">
              <BookOpen size={21} />
            </div>
            <h3>Performance has a cost.</h3>
            <p>
              Compare task-specific score and recorded spend. Inspect the stages behind a total and
              the uncertainty in cost allocation.
            </p>
            <span>
              Explore costs <ArrowRight size={15} />
            </span>
          </a>
        </div>
      </section>
      <section className="home-section">
        <SectionTitle
          number="02"
          title="Sixteen ways to test a capability gap."
          description="From mathematical reasoning to scientific discovery."
          action={
            <a className="text-link" href="#/benchmarks">
              All benchmarks <ArrowUpRight size={15} />
            </a>
          }
        />
        <div className="benchmark-ribbon">
          {BENCHMARKS.map((b) => (
            <a href={`#/benchmarks/${b.slug}`} key={b.name}>
              <span className={b.scope === 'Discovery' ? 'discovery-dot' : 'general-dot'} />
              {b.name}
              <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
      </section>
      <section className="research-banner">
        <div>
          <Eyebrow>The paper</Eyebrow>
          <h2>
            Can Adaptation Substitute
            <br />
            for Model Scale?
          </h2>
          <p>An empirical study of language model capability gaps.</p>
          <div className="method-pills">
            {Object.keys(METHOD_NAMES).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
        <div className="research-banner-action">
          <PaperLink />
          <a className="text-link" href={assetUrl('data/study.json')} download>
            Download the data <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
      <Note>
        Results preserve their original metrics and model versions. Missing experiments are shown as
        missing; discovery quality is kept on its native scale. There is no aggregate leaderboard
        across incompatible tasks.
      </Note>
    </>
  )
}
