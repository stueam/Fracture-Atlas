export type Kind = 'benchmark' | 'method' | 'result'
export type Payload = Record<string, string | number | boolean>
export interface Submission {
  id: string
  owner_id: string
  kind: Kind
  status: string
  payload: Payload
  revision: number
  lock_version: number
  reviewer_id: string | null
  target_id: string | null
  created_at: string
  updated_at: string
}
export interface Publication {
  id: string
  entity_id: string
  submission_id: string
  kind: Kind
  title: string
  payload: Payload
  benchmark_id: string | null
  method_id: string | null
  supersedes: string | null
  is_current: boolean
  published_at: string
}
export interface Attachment {
  id: string
  submission_id: string
  revision: number
  filename: string
  object_path: string
  status: string
  byte_size: number
  mime_type: string
}
export interface ReviewEvent {
  id: number
  action: string
  message: string
  revision: number
  created_at: string
}
export const kinds: Kind[] = ['result', 'benchmark', 'method']
export const kindLabel: Record<Kind, string> = {
  result: 'Experiment result',
  benchmark: 'Benchmark',
  method: 'Optimization method',
}
export const statusLabel: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting review',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  published: 'Published',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}
