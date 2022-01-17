import { LocationProvider, Router, Route, lazy, ErrorBoundary, hydrate } from 'preact-iso'
import NotFound from './pages/404.tsx'
import Header from './header.tsx'
import { VNode } from 'preact'
import { cssloader as css } from './cssloader.tsx'

import AboutStylesheets from './pages/about/about.tsx?list-of-stylesheets'

const About = lazy(() => Promise.all([import('./pages/about/about.tsx'), css(AboutStylesheets)]).then(r => r[0]))
const Home = lazy(() => import('./pages/home/home.tsx'))

export function App(): VNode {
  return (
    <div class="app">
      <Header/>
      <ErrorBoundary>
        <Router>
          <Route path="/" component={Home}/>
          <Route path="/about" component={About}/>
          <Route default component={NotFound}/>
        </Router>
      </ErrorBoundary>
    </div>
  )
}

