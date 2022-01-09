import { LocationProvider, Router, Route, lazy, ErrorBoundary, hydrate } from 'preact-iso'
import NotFound from './pages/404.tsx'
import Header from './header.tsx'
import { VNode } from 'preact'

// import './style.css'

const About = lazy(() => import('./pages/about/about.tsx'))
const Home = lazy(() => import('./pages/home/home.tsx'))

export function App(): VNode {
  return (
    <LocationProvider>
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
    </LocationProvider>
  )
}

hydrate(<App/>)
