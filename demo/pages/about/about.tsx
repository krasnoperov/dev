import styles from './about.module.css'
import Nested from './nested.tsx'
import { lazy } from '../../../utils/lazy.js'
import NestedDynamicStylesheets from './nestedDynamic.tsx?list-of-stylesheets'

const NestedDynamic = lazy(() => import('./nestedDynamic.tsx'), NestedDynamicStylesheets)

export default function About({query}) {
  return <section class={styles.about}>
    <h1>About</h1>
    <p>A page all about this website.</p>
    <pre>{JSON.stringify(query)}</pre>
    <Nested/>
    <NestedDynamic/>
  </section>
}
