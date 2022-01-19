import fs from 'fs'
import path from 'path'
import { lookup } from 'mime-types'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'

// Send the static file to the client
// Very simple implementation: enough in development and without external dependencies

/* Handler of express-like requests */
export function handler (options = {}) {
  const {
    resolveDir = process.cwd(),
  } = options

  return async (req, res) => {
    const filename = path.join(resolveDir, safeRelativePath(req.originalUrl))
    // Just read the whole file into memory, it's ok for development
    const file = await fs.promises.readFile(filename)

    res.writeHead(200, {
      'content-type': lookup(filename) || 'application/octet-stream',
      'content-length': file.length
    })
    res.end(file)
  }
}
