import fs from 'fs'
import path from 'path'
import swc from '@swc/core'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'
import { fileURLToPath } from 'url'
import pluginutils from 'rollup-pluginutils'

const DEFAULT_OPTIONS = {
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
    target: 'es2022', // Only for the strong!
  }
}

/* Load and transform tsx files */
async function tsx(filename, options) {
  const code = await fs.promises.readFile(filename, 'utf8')
  const output = await swc.transform(code, {
    filename: filename,
    ...DEFAULT_OPTIONS,
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

const defaultInclude = [
  '**/*.tsx',
  '**/*.ts',
]

const filter = pluginutils.createFilter(defaultInclude)

export const rollup = (options = {}) => ({
  name: 'tsx',
  transform(code, filename) {
    if (!filter(filename)) return null

    return swc.transform(code, { filename, ...DEFAULT_OPTIONS, ...options})
  }
})
