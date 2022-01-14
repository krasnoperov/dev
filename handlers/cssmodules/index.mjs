import path from 'path'
import { transform } from './transform.mjs'
import { fileURLToPath } from 'url'

/* Handler of express-like requests */
export function handler(options = {}) {
  const {
    storage
  } = options

  return async (req, res, next) => {
    try {
      if (req.originalUrl.endsWith('.module.css') || req.originalUrl.endsWith('.modules.css')) {
        await transform(storage, req.originalUrl, { loader: false })
      }
      return next()
    } catch (e) {
      console.error(e)
      next(e)
    }
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    storage,
    resolveDir = process.cwd()
  } = options

  const filename = fileURLToPath(url).replace(resolveDir, '')
  await transform(storage, filename, { loader: true })

  return {
    format: 'module',
    source: (await storage.get(filename))[0],
  }
}
