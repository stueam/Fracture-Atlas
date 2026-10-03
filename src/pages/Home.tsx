import { ArrowRight, Fingerprint, Layers3, Coins } from 'lucide-react'
import type { Study } from '../data'
import { SectionTitle } from '../components/UI'
import OverviewChart from '../components/OverviewChart'

export default function Home({ data }: { data: Study }) {
  return (
    <>
      <section className="overview-hero">
        <div className="overview-kicker">
          <span>FRACTURE ATLAS</span>
          <span>Research snapshot · {data.snapshotDate}</span>
        </div>
        <h1>
          Can adaptation substitute
          <br />
          for <em>model scale?</em>
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
