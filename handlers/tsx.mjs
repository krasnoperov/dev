import fs from 'fs'
import path from 'path'
import swc from '@swc/core'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'

export function tsx (options = {}) {
  const {
    resolveDir = process.cwd()
  } = options

  return async (req, res) => {
    const filename = path.join(resolveDir, safeRelativePath(req.originalUrl))
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
    })

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(output.code)
  }
}
