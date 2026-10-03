import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseImport, validate } from '../src/community/fields.ts'
test('import handles quoted CSV and does not import consent', () => {
  const p = parseImport(
    'title,summary,attestation\n"A, B","A ""quoted""\nsummary",true',
    'csv',
    'method',
  )
  assert.equal(p.title, 'A, B')
  assert.equal(p.summary, 'A "quoted"\nsummary')
  assert.equal(p.attestation, false)
  assert.throws(() => parseImport('{"owner_id":"other"}', 'json', 'result'), /Unknown field/)
  assert.throws(() => parseImport('title\nA\nB', 'csv', 'result'), /one header/)
  assert.throws(() => parseImport('{"title":{}}', 'json', 'benchmark'), /Invalid value/)
  assert.throws(() => parseImport('title, title\nA,B', 'csv', 'method'), /unique/)
})
test('missing scores, unknown cost, unmatched baseline and invalid bounds remain distinct', () => {
  const p = {
    schema_version: 1,
    title: 'Result',
    summary: 'Some result',
    contributor: 'Author',
    source_url: 'https://example.org',
    model: 'M',
    model_version: 'v1',
    run_date: '2026-01-01',
    configuration: 'c',
    aggregation: 'single',
    evidence_url: 'https://example.org/log',
    benchmark_id: 'b',
    method_id: 'm',
    score: '0',
    sample_count: '10',
    repetitions: '1',
    attestation: true,
  }
  assert.deepEqual(validate('result', p), {})
  assert.ok(validate('result', { ...p, score: '' }).score)
  assert.ok(validate('result', { ...p, baseline: '0' }).baseline_matched)
  assert.ok(validate('result', { ...p, cost_usd: '-1' }).cost_usd)
  assert.ok(validate('result', { ...p, source_url: 'javascript:alert(1)' }).source_url)
  assert.ok(validate('benchmark', { ...p, minimum: '10', maximum: '1' }).maximum)
  assert.ok(validate('result', { ...p, run_date: '2026-02-30' }).run_date)
})
