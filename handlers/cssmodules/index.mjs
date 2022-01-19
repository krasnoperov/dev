import path from 'path'
import { transform } from './transform.mjs'
import { fileURLToPath } from 'url'
import pluginutils from 'rollup-pluginutils'
import fs from 'fs'
import crypto from 'crypto'
import postcss from 'postcss'
import postcssLoadConfig from 'postcss-load-config'
import { Concat } from './utils/concat.js'
import { SourceMapConsumer } from 'source-map'

/* Handler of express-like requests */
export function handler(options = {}) {
  const {
    storage
  } = options

  return async (req, res, next) => {
    try {
      if (req.originalUrl.endsWith('.module.css') || req.originalUrl.endsWith('.modules.css')) {
        await transform(storage, req.originalUrl, { mode: "httpHandler" })
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
  await transform(storage, filename, { mode: "nodeLoader" })

  return {
    format: 'module',
    source: (await storage.get(filename))[0],
  }
}
