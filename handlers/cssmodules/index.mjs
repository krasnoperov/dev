import path from 'path'
import { transform } from './transform.mjs'

export function cssmodules(options = {}) {
  const {
    storage
  } = options

  return async (req, res, next) => {
    try {
      if (req.originalUrl.endsWith('.module.css') || req.originalUrl.endsWith('.modules.css')) {
        await transform(storage, req.originalUrl)
      }
      return next()
    } catch (e) {
      console.error(e)
      next(e)
    }
  }
}

