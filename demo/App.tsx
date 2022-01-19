import { LocationProvider, Router, Route, ErrorBoundary, hydrate } from 'preact-iso'
import NotFound from './pages/404.tsx'
import Header from './header.tsx'
import { VNode } from 'preact'
import AboutStylesheets from './pages/about/about.tsx?list-of-stylesheets'
import HomeStylesheets from './pages/home/home.tsx?list-of-stylesheets'
import { lazy } from '../utils/lazy.js'

const About = lazy(() => import('./pages/about/about.tsx'), AboutStylesheets)
const Home = lazy(() => import('./pages/home/home.tsx'), HomeStylesheets)

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

