import { ArrowRight, Fingerprint, Layers3, Coins } from 'lucide-react'
import type { Study } from '../data'
import { SectionTitle } from '../components/UI'
import OverviewChart from '../components/OverviewChart'

export default function Home({ data }: { data: Study }) {
  return (
    <>
      <section className="overview-hero">
        <svg className="fracture-motif" viewBox="0 0 340 320" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} style={{ animationDelay: `${i * 45}ms` }}>
              <path
                className="fracture-line-left"
                pathLength="1"
                d={`M 10 ${105 + i * 25} L 80 ${65 + i * 25} H 136 L 158 ${32 + i * 25}`}
              />
              <path
                className="fracture-line-right"
                pathLength="1"
                d={`M 178 ${43 + i * 25} L 200 ${10 + i * 25} H 256 L 330 ${-32 + i * 25}`}
              />
            </g>
          ))}
          <circle cx="80" cy="90" r="3" />
          <circle cx="136" cy="165" r="3" />
          <circle cx="200" cy="110" r="3" />
          <circle cx="256" cy="185" r="3" />
        </svg>
        <div className="overview-kicker">
          <span>Adaptation · Capability · Scale</span>
          <span>Research snapshot · {data.snapshotDate}</span>
        </div>
        <h1>
          <span className="overview-title-name">Fracture Atlas:</span>{' '}
          <span className="overview-title-question">
            Can Adaptation Substitute for <em>Model Scale?</em>
          </span>
        </h1>
        <p>
          Explore the capability gaps between smaller and frontier language models — and how five
          adaptation strategies change the picture.
        </p>
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
      <OverviewChart data={data} />
      <section className="home-section">
        <SectionTitle
          number="02"
          title="Explore the study"
          description="Choose the question you want to investigate next."
        />
        <div className="finding-grid">
          <a href="#/results" className="finding-card">
            <div className="finding-icon">
              <Layers3 size={24} />
            </div>
            <h3>Compare adaptation methods</h3>
            <p>
              Inspect each method’s endpoint, or switch to matched controls to measure the gain for
              an exact model version.
            </p>
            <span>
              Results explorer <ArrowRight size={17} />
            </span>
          </a>
          <a href="#/costs" className="finding-card">
            <div className="finding-icon">
              <Coins size={24} />
            </div>
            <h3>Understand the cost</h3>
            <p>
              Compare task-specific performance and recorded spend, including the stages and
              uncertainty behind each total.
            </p>
            <span>
              Cost explorer <ArrowRight size={17} />
            </span>
          </a>
          <a href="#/diagnostics" className="finding-card">
            <div className="finding-icon">
              <Fingerprint size={24} />
            </div>
            <h3>Investigate failure modes</h3>
            <p>
              Explore evaluator effects, numerical scaling errors, and the paired evidence behind
              changes in the capability gap.
            </p>
            <span>
              Diagnostics <ArrowRight size={17} />
            </span>
          </a>
        </div>
      </section>
    </>
  )
}
