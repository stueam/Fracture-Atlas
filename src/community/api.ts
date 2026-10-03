import { client } from './client'
import type { Kind, Publication, Submission, Attachment, ReviewEvent } from './types'
export async function publications(kind?: Kind, search = '', page = 0) {
  if (!client) return { rows: [] as Publication[], count: 0 }
  let q = client
    .from('publications')
    .select('*', { count: 'exact' })
    .eq('is_current', true)
    .order('published_at', { ascending: false })
    .order('id')
    .range(page * 24, page * 24 + 23)
  if (kind) q = q.eq('kind', kind)
  if (search.trim()) q = q.ilike('title', `%${search.trim().replace(/[%_\\]/g, '')}%`)
  const { data, error, count } = await q
  if (error) throw Error(error.message)
  return { rows: data as Publication[], count: count ?? 0 }
}
export async function loadSubmission(id: string) {
  if (!client) throw Error('Service is not connected.')
  const { data, error } = await client.from('submissions').select('*').eq('id', id).single()
  if (error) throw Error(error.message)
  return data as Submission
}
export async function evidence(id: string) {
  if (!client) return []
  const { data, error } = await client
    .from('attachments')
    .select('*')
    .eq('submission_id', id)
    .order('created_at')
  if (error) throw Error(error.message)
  return data as Attachment[]
}
export async function events(id: string) {
  if (!client) return []
  const { data, error } = await client
    .from('review_events')
    .select('*')
    .eq('submission_id', id)
    .order('id')
  if (error) throw Error(error.message)
  return data as ReviewEvent[]
}
export async function downloadEvidence(file: Attachment) {
  if (!client) throw Error('Service not connected')
  const { data, error } = await client.storage
    .from('submission-evidence')
    .createSignedUrl(file.object_path, 60, { download: file.filename })
  if (error) throw Error(error.message)
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}
