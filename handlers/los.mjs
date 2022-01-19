import fs from 'fs'
import path from 'path'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'
import { fileURLToPath } from 'url'

const EMPTY_LIST = 'export default []'

/* Handler of express-like requests */
export function handler (options = {}) {
  const {
    resolveDir = process.cwd(),
  } = options

  return async (req, res, next) => {
    if (req.query['list-of-stylesheets'] !== '') {
      return next() // Nothing to do here
    }

    // In development use empty list
    let code = EMPTY_LIST

    // In production load actual list of stylesheets
    if (process.env.NODE_ENV === 'production') {
      const filename = path.join(resolveDir, 'build/@build', safeRelativePath(req.originalUrl.replace('?list-of-stylesheets', '')))
      code = await fs.promises.readFile(filename)
    }

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(code)
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    resolveDir = process.cwd()
  } = options

  if (!url.endsWith('list-of-stylesheets')) {
    return // Nothing to do here
  }

  // In development use empty list
  let code = EMPTY_LIST

  // In production load actual list of stylesheets
  if (process.env.NODE_ENV === 'production') {
    const filename = path.join(resolveDir, 'build/@build', fileURLToPath(url).replace('?list-of-stylesheets', '').replace(resolveDir, ''))
    code = await fs.promises.readFile(filename)
  }

  return {
    format: 'module',
    source: code,
  }
}
