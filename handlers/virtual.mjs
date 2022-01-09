import { contentType } from 'mime-types'
import path from 'path'
import { safeRelativePath } from '../utils/safeRelativePath.mjs'

export function virtual( options = {} ) {
  const {
    storage
  } = options

  return async (req, res, next) => {
    try {
      const result = await storage.get(safeRelativePath(req.originalUrl))
      if (!result) {
        return next()
      }
      res.writeHead(200, { 'content-type': result[1] || 'application/octet-stream' })
      res.end(result[0])
    } catch(e) {
      console.error(e)
      next(e)
    }
  }
}
