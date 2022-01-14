import { LocationProvider, hydrate } from 'preact-iso'
import { App } from './App.tsx'

hydrate(<LocationProvider><App/></LocationProvider>)
