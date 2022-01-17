import styles from './nestedDynamic.module.css'
import { useState } from 'preact/hooks'

export default function Nested() {
  const [ count, setCount ] = useState(0)

  return (
    <>
      <section class={styles.nested}>
        <h1>Nested</h1>
        <p>This is the nested page.</p>
      </section>
    </>
  )
}
