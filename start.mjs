import path from 'path'
import polka from 'polka'
import devcert from 'devcert'
import { createSecureServer } from 'http2'
import file from './handlers/file.mjs'
import tsx from './handlers/tsx.mjs'
import cssmodules from './handlers/cssmodules.mjs'

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

const resolveDir = process.cwd()

function handle (pattern, handler) {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.originalUrl.match(pattern)) {
      next()
      return
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
app.use(handle(/.*\.html$/, file))
app.use(handle(/^\/node_modules\//, file))
app.use(handle(/.*\.tsx$/, tsx))
app.use(handle(/.*\.css$/, cssmodules))
app.use(handle(/.*\.css\?css$/, cssmodules))
app.use(handle(/.*\.css\.map$/, cssmodules))

app.listen(process.env.PORT || 443, () => {
  console.log('server ready')
})
