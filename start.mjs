import path from 'path'
import polka from 'polka'
import devcert from 'devcert'
import { createSecureServer } from 'http2'
import { tsx } from './handlers/tsx.mjs'
import { cssmodules } from './handlers/cssmodules/index.mjs'
import { file } from './handlers/file.mjs'
import { url } from './handlers/url.mjs'
import { virtual } from './handlers/virtual.mjs'
import { MemoryStorage } from './storages/MemoryStorage.mjs'

export async function createHttp2Server (options = {}) {
  const { key, cert } = await devcert.certificateFor(process.env.HOST || 'localhost')
  return createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    ...options
  })
}

const server = await createHttp2Server()

const app = polka({ server })

const memoryStorage = new MemoryStorage()

const resolveDir = process.cwd()

function handle (pattern, handler) {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.originalUrl.match(pattern)) {
      return next()
    }
    try {
      const result = await handler({
        resolveDir,
        path: req.originalUrl
      })
      if (result) {
        res.writeHead(200, { 'content-type': result.contentType })
        res.end(result.body)
      } else {
        next()
      }
    } catch (e) {
      console.error(e)
      next(e)
    }
  }
}

app.use((req, res, next) => {
  console.log(req.method, req.originalUrl)
  next()
})

app.get(/.*\.tsx$/, tsx())

app.get(/.*\.svg$/, url(), file())

// Convert single .modules.css to the couple of JS and CSS files and serve them from the filesystem
app.get(/.*\.css$/, cssmodules({ storage: memoryStorage }), virtual({ storage: memoryStorage }), file())

app.get(/.*.map$/, file())

// Serve node_modules as is
app.get(/\/node_modules\//, file()) // String instead of regexp removes prefix from path

// Temporary entrypoint
app.get(/.*\.html$/, file())

app.listen(process.env.PORT || 443, () => {
  console.log('server ready')
})
