import { SubmissionList, SubmissionDetail } from './Submissions'
import Submit from './Submit'
import './community.css'
import { Account } from './Auth'
import { PageIntro } from '../components/UI'
export default function CommunityApp({ path }: { path: string }) {
  if (path === '/account/submissions') return <SubmissionList />
  if (path === '/admin/reviews') return <SubmissionList admin />
  if (/^\/admin\/reviews\/[^/]+$/.test(path))
    return <SubmissionDetail id={path.split('/')[3]} admin />
  if (/^\/submissions\/[^/]+$/.test(path)) return <SubmissionDetail id={path.split('/')[2]} />
  if (path === '/submit') return <Submit />
  if (/^\/submissions\/[^/]+\/edit$/.test(path)) return <Submit id={path.split('/')[2]} />
  if (path === '/account' || path === '/account/security') return <Account />
  return (
    <>
      <PageIntro
        eyebrow="Aetherheart � Community"
        title={path.startsWith('/submit') ? 'Submit a contribution' : 'Community'}
        text="Share benchmarks, adaptation methods, and reproducible results."
      />
      <div className="note">
        Community submissions are being prepared. The published paper snapshot remains available.
      </div>
    </>
  )
}
