import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Code2, FlaskConical } from 'lucide-react'
import { number, sourceUrl } from '../data'
import type { Study } from '../data'
import { Eyebrow, Note, PageIntro, SectionTitle } from '../components/UI'

export default function Diagnostics({ data }: { data: Study }) {
  const [cohort, setCohort] = useState<'base' | 'RL' | 'K3_teacher_train1000'>('base')
  const [rule, setRule] = useState('strip_final_x100')
  const replay = data.diagnostics[cohort].replay[rule]
  const before = (replay.before_correct / replay.n) * 100,
    after = (replay.after_correct / replay.n) * 100
  const example = replay.examples.find((e) => !e.before && e.after) || replay.examples[0]
  const names = {
    base: 'Qwen3.8-27B base',
    RL: 'Qwen3.8-27B RL',
    K3_teacher_train1000: 'K3 teacher · train sample',
  }
  return (
    <>
      <PageIntro
        eyebrow="Understand the failure mode"
        title="Behind the score"
        text="Use paired controls and deterministic trace replay to understand why a reported result changes."
      />
      <div className="diagnostic-tabs">
        <span>
          <FlaskConical size={16} />
          Diagnostic evidence
        </span>
        <a href={sourceUrl(data, data.sources.diagnostics.path)} target="_blank" rel="noreferrer">
          Replay source <ArrowUpRight size={14} />
        </a>
      </div>
      <section className="diagnostic-section">
        <SectionTitle
          number="01"
          title="A numerical scaling failure in FinQA"
          description="Remove a final multiply-by-100 operation and re-evaluate the saved program traces."
        />
        <div className="replay-controls">
          <div className="segmented" role="group" aria-label="Replay cohort">
            {(Object.keys(names) as (keyof typeof names)[]).map((c) => (
              <button key={c} className={c === cohort ? 'active' : ''} onClick={() => setCohort(c)}>
                {names[c]}
              </button>
            ))}
          </div>
          <label className="rule-select">
            Replay rule
            <select aria-label="Replay rule" value={rule} onChange={(e) => setRule(e.target.value)}>
              <option value="strip_final_x100">All matching final ×100 outputs</option>
              <option value="strip_final_x100_percent_question">
                Percent / percentage questions only
              </option>
            </select>
          </label>
        </div>
        <div className="diagnostic-disclosure">
          <FlaskConical size={18} />
          <div>
            <b>Post-hoc diagnostic replay</b>
            <p>
              The rule was selected after inspecting test errors. These replay scores are diagnostic
              evidence, and are not held-out adaptation results.
            </p>
          </div>
        </div>
        <div className="replay-panel">
          <div className="replay-score">
            <span>Original trace score</span>
            <strong>
              {number(before)}
              <small>%</small>
            </strong>
            <p>
              {replay.before_correct} / {replay.n} correct
            </p>
          </div>
          <div className="replay-arrow">
            <ArrowRight size={30} />
            <span>Deterministic replay</span>
          </div>
          <div className="replay-score after">
            <span>After replay</span>
            <strong>
              {number(after)}
              <small>%</small>
            </strong>
            <p>
              {replay.after_correct} / {replay.n} correct
            </p>
          </div>
          <div className="replay-outcomes">
            <div>
              <Check size={15} />
              <strong>{replay.repairs}</strong>
              <span>repairs</span>
            </div>
            <div>
              <span className="regression-dot" />
              <strong>{replay.regressions}</strong>
              <span>regressions</span>
            </div>
          </div>
        </div>
        <p className="rule-description">
          <Code2 size={16} />
          {data.diagnostics.rules[rule]}
        </p>
        {example && (
          <div className="trace-example">
            <div className="trace-example-head">
              <Eyebrow>Saved trace example</Eyebrow>
              <code>{example.id}</code>
            </div>
            <h3>{example.question}</h3>
            <div className="trace-programs">
              <div>
                <span>Original program</span>
                <pre>{example.program_before}</pre>
              </div>
              <div>
                <span>Replayed program</span>
                <pre>{example.program_after}</pre>
              </div>
            </div>
            <div className="trace-outcome">
              {example.before ? 'Correct' : 'Incorrect'} <ArrowRight size={13} />{' '}
              {example.after ? 'Correct' : 'Incorrect'}
              <span>Re-evaluated with the original evaluator</span>
            </div>
          </div>
        )}
      </section>
      <section className="diagnostic-section">
        <SectionTitle
          number="02"
          title="Does SFT narrow the size gap?"
          description="Twelve task comparisons with paired Qwen3-8B and Qwen3.6-27B controls from the paper's audited SFT table."
        />
        <div className="gap-summary">
          <div>
            <strong>{data.questions.q2_summary.absolute_narrows}</strong>
            <p>tasks with a narrower absolute gap</p>
          </div>
          <div>
            <strong>{data.questions.q2_summary.absolute_widens}</strong>
            <p>tasks with a wider absolute gap</p>
          </div>
          <Note compact>
            These are task counts from the matched SFT analysis. They describe the size gap; they do
            not mean every model improved on every task.
          </Note>
        </div>
        <div className="table-container">
          <table className="gap-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>8B control → SFT</th>
                <th>27B control → SFT</th>
                <th>Absolute gap</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {data.questions.q2_sft.map((r) => (
                <tr key={r.task}>
                  <td>
                    <b>{r.task}</b>
                  </td>
                  <td>
                    {number(r.control_8b)} → {number(r.sft_8b)}
                  </td>
                  <td>
                    {number(r.control_27b)} → {number(r.sft_27b)}
                  </td>
                  <td>
                    {number(Math.abs(r.gap_before))} → {number(Math.abs(r.gap_after))}
                  </td>
                  <td>
                    <span
                      className={`gap-tag ${Math.abs(r.gap_after) < Math.abs(r.gap_before) ? 'narrows' : 'widens'}`}
                    >
                      {Math.abs(r.gap_after) < Math.abs(r.gap_before) ? 'Narrows' : 'Widens'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-caption">
          <span>Percentage-point differences · Generalization tasks</span>
          <a href={sourceUrl(data, data.sources.questions.path)} target="_blank" rel="noreferrer">
            Audited source <ArrowUpRight size={13} />
          </a>
        </div>
      </section>
    </>
  )
}
