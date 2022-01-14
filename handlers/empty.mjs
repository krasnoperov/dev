/* Node ES modules loader */
export async function loader (url) {
  return {
    format: 'module',
    source: `export default {};`,
  }
}
