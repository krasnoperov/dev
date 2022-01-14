import { fileURLToPath } from 'url'

/* Handler of express-like requests */
export function handler () {
  return (req, res, next) => {
    // skip handling if there is no ?url parameter
    if (req.query.url !== '') {
      return next()
    }

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(`export default "${req.path}";`)
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    resolveDir = process.cwd(),
  } = options

  return {
    format: 'module',
    source: `export default "${fileURLToPath(url).replace('?url', '').replace(resolveDir, '')}";`,
  }
}
