import type { Kind, Payload } from './types'
export interface Field {
  key: string
  label: string
  step: number
  required?: boolean
  type?: 'text' | 'textarea' | 'number' | 'date' | 'url' | 'select' | 'checkbox'
  options?: string[]
  help?: string
}
const common: Field[] = [
  { key: 'title', label: 'Title', step: 0, required: true },
  { key: 'summary', label: 'Summary', step: 0, type: 'textarea', required: true },
  {
    key: 'contributor',
    label: 'Public contributor name',
    step: 0,
    required: true,
    help: 'This name will be shown publicly after approval. Your login email is not published.',
  },
  { key: 'institution', label: 'Institution (optional)', step: 0 },
  {
    key: 'source_url',
    label: 'Paper, repository or source URL',
    step: 2,
    type: 'url',
    required: true,
  },
  { key: 'limitations', label: 'Limitations and caveats', step: 2, type: 'textarea' },
  {
    key: 'attestation',
    label:
      'I have permission to share these details publicly and the information accurately describes this contribution.',
    step: 3,
    type: 'checkbox',
    required: true,
  },
]
const benchmark: Field[] = [
  { key: 'category', label: 'Task category', step: 0, required: true },
  { key: 'version', label: 'Dataset / benchmark version', step: 1, required: true },
  { key: 'license', label: 'License or data usage terms', step: 1, required: true },
  { key: 'split', label: 'Split / subset', step: 1, required: true },
  { key: 'metric', label: 'Metric name', step: 1, required: true },
  { key: 'unit', label: 'Unit (%, ratio, quality, seconds…)', step: 1, required: true },
  {
    key: 'direction',
    label: 'Better score direction',
    step: 1,
    type: 'select',
    options: ['higher', 'lower'],
    required: true,
  },
  { key: 'minimum', label: 'Known minimum (leave blank if unknown)', step: 1, type: 'number' },
  { key: 'maximum', label: 'Known maximum (leave blank if unknown)', step: 1, type: 'number' },
  { key: 'evaluator', label: 'Evaluator / scoring script version', step: 1, required: true },
  {
    key: 'protocol',
    label: 'Evaluation protocol',
    step: 1,
    type: 'textarea',
    required: true,
    help: 'Describe prompts, tool access, scoring aggregation, sample selection and constraints. Changes require a new version.',
  },
]
const method: Field[] = [
  {
    key: 'family',
    label: 'Method family',
    step: 0,
    type: 'select',
    options: ['ICL', 'SkillOpt', 'SFT', 'RL', 'TTT', 'Other'],
    required: true,
  },
  { key: 'version', label: 'Method version / code revision', step: 1, required: true },
  {
    key: 'configuration',
    label: 'Configuration and applicability',
    step: 1,
    type: 'textarea',
    required: true,
    help: 'Include hyperparameters, teacher, optimization budget and applicable model/task conditions.',
  },
]
const result: Field[] = [
  { key: 'benchmark_id', label: 'Approved benchmark protocol', step: 1, required: true },
  { key: 'method_id', label: 'Approved method version', step: 1, required: true },
  { key: 'model', label: 'Model identifier', step: 1, required: true },
  {
    key: 'model_version',
    label: 'Exact model version / dated API identifier',
    step: 1,
    required: true,
  },
  { key: 'run_date', label: 'Run date', step: 1, type: 'date', required: true },
  {
    key: 'score',
    label: 'Reported score (in the selected protocol’s unit)',
    step: 1,
    type: 'number',
    required: true,
  },
  { key: 'baseline', label: 'Matched baseline score (optional)', step: 1, type: 'number' },
  {
    key: 'baseline_matched',
    label: 'The baseline uses the same model version, evaluator, split and evaluation conditions.',
    step: 1,
    type: 'checkbox',
  },
  { key: 'sample_count', label: 'Evaluated samples', step: 1, type: 'number', required: true },
  { key: 'repetitions', label: 'Number of runs', step: 1, type: 'number', required: true },
  {
    key: 'aggregation',
    label: 'Aggregation (single / mean / best-of-N and details)',
    step: 1,
    required: true,
  },
  {
    key: 'configuration',
    label: 'Run configuration',
    step: 1,
    type: 'textarea',
    required: true,
    help: 'Include precision/quantization, decoding, tools, prompts, environment and any uncertainty estimates.',
  },
  {
    key: 'cost_usd',
    label: 'Recorded cost in USD (optional)',
    step: 1,
    type: 'number',
    help: 'Leave unknown cost blank. Zero means a measured zero, not missing data.',
  },
  { key: 'cost_notes', label: 'Cost accounting and included stages', step: 1, type: 'textarea' },
  {
    key: 'evidence_url',
    label: 'Reproducibility evidence URL',
    step: 2,
    type: 'url',
    required: true,
    help: 'A versioned run log, result archive, paper or repository. Private attachments are supporting evidence only.',
  },
]
export const fieldsFor = (kind: Kind) =>
  [...common, ...{ benchmark, method, result }[kind]].sort((a, b) => a.step - b.step)
export function emptyPayload(): Payload {
  return {
    schema_version: 1,
    repetitions: '1',
    aggregation: 'single',
    direction: 'higher',
    attestation: false,
  }
}
export function validate(kind: Kind, p: Payload): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fieldsFor(kind)) {
    const value = p[f.key]
    if (f.required && (f.type === 'checkbox' ? value !== true : !String(value ?? '').trim()))
      errors[f.key] = 'This field is required.'
    if (value !== undefined && value !== '' && f.type === 'url') {
      try {
        const u = new URL(String(value))
        if (!['http:', 'https:'].includes(u.protocol)) throw Error()
      } catch {
        errors[f.key] = 'Use a complete http or https URL.'
      }
    }
    if (
      value !== undefined &&
      value !== '' &&
      f.type === 'number' &&
      (!/^-?\d+(\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value)))
    )
      errors[f.key] = 'Enter a finite decimal number.'
  }
  if (String(p.title ?? '').length > 160) errors.title = 'Use at most 160 characters.'
  if (String(p.summary ?? '').length > 6000) errors.summary = 'Use at most 6,000 characters.'
  if (
    kind === 'benchmark' &&
    p.minimum !== '' &&
    p.maximum !== '' &&
    p.minimum !== undefined &&
    p.maximum !== undefined &&
    Number(p.minimum) >= Number(p.maximum)
  )
    errors.maximum = 'Maximum must be greater than minimum.'
  if (kind === 'result') {
    for (const key of ['sample_count', 'repetitions'])
      if (!/^[1-9]\d*$/.test(String(p[key] ?? ''))) errors[key] = 'Use a positive whole number.'
    if (p.cost_usd !== undefined && p.cost_usd !== '' && Number(p.cost_usd) < 0)
      errors.cost_usd = 'Cost cannot be negative.'
    if (p.cost_usd !== undefined && p.cost_usd !== '' && !String(p.cost_notes ?? '').trim())
      errors.cost_notes = 'Describe what this cost includes.'
    if (p.baseline !== undefined && p.baseline !== '' && p.baseline_matched !== true)
      errors.baseline_matched = 'Confirm the evaluation conditions match or omit this baseline.'
    if (
      p.run_date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.run_date)) ||
        Number.isNaN(Date.parse(String(p.run_date))) ||
        new Date(String(p.run_date)).toISOString().slice(0, 10) !== String(p.run_date) ||
        String(p.run_date) > new Date().toISOString().slice(0, 10))
    )
      errors.run_date = 'Use a valid past or current date.'
  }
  return errors
}
// RFC-style quoted cells, including escaped quotes and newlines. One aggregate record per import.
export function parseImport(text: string, format: 'json' | 'csv', kind: Kind): Payload {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error('Import must be under 2 MB.')
  let value: unknown
  if (format === 'json') value = JSON.parse(text)
  else {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = !quoted
      } else if (!quoted && (c === ',' || c === '\n')) {
        row.push(cell.replace(/\r$/, ''))
        cell = ''
        if (c === '\n') {
          rows.push(row)
          row = []
        }
      } else cell += c
    }
    if (quoted) throw Error('Unclosed CSV quote.')
    if (cell || row.length) {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
    }
    const nonempty = rows.filter((r) => r.some((c) => c.trim()))
    if (nonempty.length !== 2)
      throw Error(
        'Use one header row and one aggregate experiment row. Attach per-run logs as evidence.',
      )
    if (
      new Set(nonempty[0].map((h) => h.trim())).size !== nonempty[0].length ||
      nonempty[0].length !== nonempty[1].length
    )
      throw Error('CSV columns must be unique and match the data row.')
    value = Object.fromEntries(nonempty[0].map((h, i) => [h.trim(), nonempty[1][i]]))
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected a single JSON object.')
  const allowed = new Set(['schema_version', ...fieldsFor(kind).map((f) => f.key)])
  const parsed: Payload = { schema_version: 1 }
  for (const [key, v] of Object.entries(value)) {
    if (!allowed.has(key)) throw Error(`Unknown field: ${key}`)
    if (v !== null && !['string', 'number', 'boolean'].includes(typeof v))
      throw Error(`Invalid value: ${key}`)
    parsed[key] = v ?? ''
  }
  for (const f of fieldsFor(kind).filter((f) => f.type === 'checkbox'))
    parsed[f.key] = parsed[f.key] === true || parsed[f.key] === 'true'
  if (parsed.schema_version !== 1 && parsed.schema_version !== '1')
    throw Error('Unsupported schema version.')
  parsed.schema_version = 1
  parsed.attestation = false
  return parsed
}
