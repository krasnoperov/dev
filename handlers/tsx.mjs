import fs from 'fs'
import path from 'path'
import swc from '@swc/core'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'
import { fileURLToPath } from 'url'

/* Load and transform tsx files */
async function tsx(filename, options) {
  const code = await fs.promises.readFile(filename, 'utf8')
  const output = await swc.transform(code, {
    filename: filename,
    configFile: true,
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
        dynamicImport: true,
      },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: 'preact',
        }
      },
      target: 'es2016',
    },
    ...options,
  })
  return output.code
}

/* Handler of express-like requests */
export function handler (options = {}) {
  const {
    resolveDir = process.cwd(),
  } = options

  return async (req, res) => {
    const filename = path.join(resolveDir, safeRelativePath(req.originalUrl))
    const code = await tsx(filename, options)
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(code)
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    resolveDir = process.cwd()
  } = options

  const filename = fileURLToPath(url)
  const code = await tsx(filename, options)

  return {
    format: 'module',
    source: code,
  }

}
