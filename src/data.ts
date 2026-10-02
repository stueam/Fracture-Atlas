export const MODELS = ['Qwen3-8B', 'Qwen3.6-27B', 'Qwen3.8-27B'] as const
export const METHODS = ['ICL', 'SkillOpt', 'SFT', 'RL', 'TTT'] as const
export const METHOD_COLORS: Record<string, string> = {
  ICL: '#63875f',
  SkillOpt: '#4f81a3',
  SFT: '#d46845',
  RL: '#9181ac',
  TTT: '#b59a3f',
}
export const METHOD_NAMES: Record<string, string> = {
  ICL: 'In-context learning',
  SkillOpt: 'Skill optimization',
  SFT: 'Supervised fine-tuning',
  RL: 'Reinforcement learning',
  TTT: 'Test-time training',
}

export interface Benchmark {
  name: string
  slug: string
  family: string
  description: string
  scope: 'Generalization' | 'Discovery'
  metric: string
}

export const BENCHMARKS: Benchmark[] = [
  {
    name: 'LiveMath',
    slug: 'livemath',
    family: 'Reasoning',
    description: 'Mathematical problem solving under task-specific evaluation.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'SearchQA',
    slug: 'searchqa',
    family: 'Knowledge',
    description: 'Answer questions from retrieved evidence.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'HotpotQA',
    slug: 'hotpotqa',
    family: 'Knowledge',
    description: 'Multi-hop question answering across supporting documents.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'FinQA',
    slug: 'finqa',
    family: 'Reasoning',
    description: 'Numerical reasoning over financial text and tables.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'SpreadsheetBench',
    slug: 'spreadsheetbench',
    family: 'Structured tasks',
    description: 'Spreadsheet manipulation with execution-based evaluation.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'Circle Packing N=26',
    slug: 'circle-packing',
    family: 'Discovery',
    description: 'Search for feasible packings of 26 circles.',
    scope: 'Discovery',
    metric: 'Quality',
  },
  {
    name: 'Erdős Min Overlap',
    slug: 'erdos-min-overlap',
    family: 'Discovery',
    description: 'Construct solutions to a minimum-overlap optimization problem.',
    scope: 'Discovery',
    metric: 'Quality',
  },
  {
    name: 'REI',
    slug: 'rei',
    family: 'Discovery',
    description: 'A scientific discovery workload with task-native quality evaluation.',
    scope: 'Discovery',
    metric: 'Quality',
  },
  {
    name: 'BFCL V4',
    slug: 'bfcl-v4',
    family: 'Tool use',
    description: 'Function calling with structured tool arguments.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'τ²-bench',
    slug: 'tau2-bench',
    family: 'Tool use',
    description: 'Interactive agent evaluation in tool-based environments.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'API-Bank',
    slug: 'api-bank',
    family: 'Tool use',
    description: 'API selection and invocation across distinct evaluation strata.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'Spider',
    slug: 'spider',
    family: 'Structured tasks',
    description: 'Translate natural language into executable SQL.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'IFEval',
    slug: 'ifeval',
    family: 'Instruction following',
    description: 'Follow instructions with verifiable output constraints.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'FollowBench',
    slug: 'followbench',
    family: 'Instruction following',
    description: 'Meet increasingly demanding instruction constraints.',
    scope: 'Generalization',
    metric: 'HSR (%)',
  },
  {
    name: 'TNEWS',
    slug: 'tnews',
    family: 'Language understanding',
    description: 'Chinese short-text classification.',
    scope: 'Generalization',
    metric: 'Score (%)',
  },
  {
    name: 'CLUENER2020',
    slug: 'cluener2020',
    family: 'Language understanding',
    description: 'Chinese named-entity recognition with macro-F1 evaluation.',
    scope: 'Generalization',
    metric: 'Macro-F1 (%)',
  },
]

export interface Candidate {
  method: string
  value: number
  raw_score: string
  trace: string
  source_line: number
  excluded_reason: string | null
}
export interface OverviewRecord {
  benchmark: string
  model: string
  metric: string
  baseline: number | null
  top: number | null
  caveat: boolean
  method_label: string | null
  selected_method: Candidate | null
  candidates: Candidate[]
  baseline_raw: string | null
  baseline_source_line: number | null
  unavailable_baseline: boolean
}
export interface MethodRecord {
  benchmark: string
  model: string
  method: string
  value: number | null
  exclusion: string | null
  rl_version_replacement: boolean
  primary_model: string
  source: { recipe: string; raw: string; trace: string; source_line: number; cost: string } | null
}
export interface MatchedPair {
  benchmark: string
  model: string
  method: string
  value: number
  endpoint: number
  trace: string
  source: string
  source_line: number
  cost_usd: number | null
}
export interface CostRecord {
  id: string
  benchmark: string
  model: string
  method: string
  value: number
  total_cost_usd: number | null
  cost_status: string
  frontier_eligible: boolean
  accounting_usable: boolean
  exclusion_reasons: string[]
  adaptation_lower_usd: number | null
  adaptation_upper_usd: number | null
  allocation_interval: boolean
  components: {
    key: string
    label: string
    cost_usd: number
    stages: string[]
    accounting: string
    resolution: string
  }[]
  source: { file: string; lines: number[] }
  trace: string
  notes: { message: string }[]
}
export interface Study {
  paperTitle: string
  commit: string
  snapshotDate: string
  repository: string
  sources: Record<string, { path: string; sha256: string }>
  overview: { models: string[]; records: OverviewRecord[] }
  methods: { records: MethodRecord[] }
  matched: { pairs: MatchedPair[] }
  costs: { records: CostRecord[] }
  questions: {
    q2_summary: { absolute_narrows: number; absolute_widens: number }
    q2_sft: {
      task: string
      control_8b: number
      sft_8b: number
      control_27b: number
      sft_27b: number
      gap_before: number
      gap_after: number
      change: number
    }[]
  }
  diagnostics: {
    status: string
    rules: Record<string, string>
    base: ReplayCohort
    RL: ReplayCohort
    K3_teacher_train1000: ReplayCohort
  }
}
export interface ReplayCohort {
  replay: Record<
    string,
    {
      n: number
      before_correct: number
      after_correct: number
      repairs: number
      regressions: number
      net_gain_pp: number
      examples: {
        id: string
        question: string
        program_before: string
        program_after: string
        before: boolean
        after: boolean
      }[]
    }
  >
}

export function overviewFor(data: Study, benchmark: string, model: string) {
  return data.overview.records.find((r) => r.benchmark === benchmark && r.model === model)
}
export function methodFor(data: Study, benchmark: string, model: string, method: string) {
  return data.methods.records.find(
    (r) => r.benchmark === benchmark && r.model === model && r.method === method,
  )
}
// A same-name control is insufficient: its recorded endpoint must agree with the displayed result.
export function matchedFor(data: Study, record: MethodRecord | undefined) {
  if (!record || record.value === null || record.exclusion) return undefined
  return data.matched.pairs.find(
    (p) =>
      p.benchmark === record.benchmark &&
      p.model === record.model &&
      p.method === record.method &&
      Math.abs(p.endpoint - record.value!) < 0.00001 &&
      p.trace === record.source?.trace,
  )
}
export function number(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}
export function metricValue(value: number | null | undefined, benchmark: string) {
  return number(value, BENCHMARKS.find((b) => b.name === benchmark)?.scope === 'Discovery' ? 4 : 2)
}
export function dollars(value: number | null | undefined) {
  return value === null || value === undefined
    ? 'Unreported'
    : `$${number(value, value < 1 ? 4 : 2)}`
}
export function allocation(record: CostRecord) {
  if (record.adaptation_lower_usd === null || record.adaptation_upper_usd === null)
    return 'Unresolved'
  return record.allocation_interval
    ? `${dollars(record.adaptation_lower_usd)} – ${dollars(record.adaptation_upper_usd)}`
    : dollars(record.adaptation_lower_usd)
}
export function sourceUrl(data: Study, path: string, line?: number | null) {
  return `${data.repository}/blob/${data.commit}/${path.split('/').map(encodeURIComponent).join('/')}${line ? `#L${line}` : ''}`
}
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
