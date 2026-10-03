import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { BENCHMARKS, assetUrl } from './data'
import type { Study } from './data'
import { Footer, Header, RecordDrawer } from './components/UI'
import type { Inspection } from './components/UI'
import Home from './pages/Home'
import Results from './pages/Results'
import { BenchmarkDetail, BenchmarkRegistry } from './pages/Benchmarks'
import Costs from './pages/Costs'
import Diagnostics from './pages/Diagnostics'
import Paper from './pages/Paper'
import CommunityApp from './community/CommunityApp'
import { communityEnabled } from './community/config'

const getRoute = () => window.location.hash.replace(/^#/, '') || '/'

export default function App() {
  const [route, setRoute] = useState(getRoute)
  const path = route.split('?')[0].replace(/\/$/, '') || '/'
  const [data, setData] = useState<Study | null>(null)
  const [error, setError] = useState('')
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const close = useCallback(() => setInspection(null), [])
  useEffect(() => {
    const controller = new AbortController()
    fetch(assetUrl('data/study.json'), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Data request failed (${r.status})`)
        return r.json()
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute())
      setInspection(null)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    const name = path.startsWith('/benchmarks/')
      ? BENCHMARKS.find((b) => path === `/benchmarks/${b.slug}`)?.name
      : (
          {
            '/': 'Mapping the limits of adaptation',
            '/results': 'Results explorer',
            '/benchmarks': 'Benchmark registry',
            '/costs': 'Cost explorer',
            '/diagnostics': 'Behind the score',
            '/paper': 'Paper & resources',
          } as Record<string, string>
        )[path]
    document.title = `${name || 'Page not found'} — Fracture Atlas`
  }, [path])
  const communityRoute =
    communityEnabled && /^\/(community|submit|submissions|account|admin)(\/|$)/.test(path)
  let page
  if (communityRoute) page = <CommunityApp key={path} path={path} />
  else if (error)
    page = (
      <div className="loading-page">
        <h1>Unable to load the research snapshot.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    )
  else if (!data)
    page = (
      <div className="loading-page">
        <span className="loading-mark" />
        <p>Loading the capability map…</p>
      </div>
    )
  else if (path === '/') page = <Home data={data} />
  else if (path === '/results') page = <Results key={route} data={data} inspect={setInspection} />
  else if (path === '/benchmarks') page = <BenchmarkRegistry />
  else if (path.startsWith('/benchmarks/')) {
    const benchmark = BENCHMARKS.find((b) => path === `/benchmarks/${b.slug}`)
    if (benchmark)
      page = (
        <BenchmarkDetail key={route} benchmark={benchmark} data={data} inspect={setInspection} />
      )
  } else if (path === '/costs') page = <Costs key={route} data={data} inspect={setInspection} />
  else if (path === '/diagnostics') page = <Diagnostics data={data} />
  else if (path === '/paper') page = <Paper data={data} />
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <Header path={path} />
      <main id="main" className="main-content" tabIndex={-1}>
        {page || (
          <div className="empty-state">
            <h1>Page not found.</h1>
            <a className="button primary" href="#/">
              Back to the atlas <ArrowRight size={15} />
            </a>
          </div>
        )}
      </main>
      <Footer data={data ?? undefined} />
      {inspection && data && <RecordDrawer data={data} inspection={inspection} close={close} />}
    </>
  )
}
