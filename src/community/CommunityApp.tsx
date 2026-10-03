import { PageIntro } from '../components/UI'
export default function CommunityApp({ path }: { path: string }) {
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
