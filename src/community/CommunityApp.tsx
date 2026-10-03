import { SubmissionList, SubmissionDetail } from './Submissions'
import Submit from './Submit'
import './community.css'
import { Account } from './Auth'
import { Catalog, PublicationDetail } from './Catalog'
export default function CommunityApp({ path }: { path: string }) {
  if (path === '/account/submissions') return <SubmissionList />
  if (path === '/admin/reviews') return <SubmissionList admin />
  if (/^\/admin\/reviews\/[^/]+$/.test(path))
    return <SubmissionDetail id={path.split('/')[3]} admin />
  if (/^\/submissions\/[^/]+$/.test(path)) return <SubmissionDetail id={path.split('/')[2]} />
  if (path === '/submit') return <Submit />
  if (/^\/submissions\/[^/]+\/edit$/.test(path)) return <Submit id={path.split('/')[2]} />
  if (path === '/account' || path === '/account/security') return <Account />
  if (path === '/community') return <Catalog />
  if (/^\/community\/publications\/[^/]+$/.test(path))
    return <PublicationDetail id={path.split('/')[3]} />
  return (
    <div className="community-empty">
      <h1>Page not found</h1>
      <a href="#/community">Return to Community</a>
    </div>
  )
}
