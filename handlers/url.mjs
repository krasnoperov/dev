import fs from 'fs'
import path from 'path'
import swc from '@swc/core'
import { contentType } from 'mime-types'

export function url (options = {}) {
  const {
    resolveDir = process.cwd()
  } = options

  return (req, res, next) => {
    // skip handling if there is no ?url parameter
    if (req.query.url !== '') {
      return next()
    }

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(`export default "${req.path}";`)
  }
}
