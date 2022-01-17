/* Node ES modules loader */
export async function loader (url) {
  return {
    format: 'module',
    source: `export default [];`,
  }
}

/* Handler of express-like requests */
export function handler () {
  return (req, res, next) => {

    // skip handling if there is no ?url parameter
    if (req.query['list-of-stylesheets'] !== '') {
      return next()
    }

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(`export default [];`)
  }
}
