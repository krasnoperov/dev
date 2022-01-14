import styles from './about.module.css'

export default function About({query}) {
  return <section class={styles.about}>
    <h1>About</h1>
    <p>A page all about this website.</p>
    <pre>{JSON.stringify(query)}</pre>
  </section>
}
