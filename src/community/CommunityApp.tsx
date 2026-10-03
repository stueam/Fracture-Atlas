import Submit from './Submit'
import './community.css'
import { Account } from './Auth'
import { PageIntro } from '../components/UI'
export default function CommunityApp({ path }: { path: string }) {
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
