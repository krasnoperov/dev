import path from 'path'
import polka from 'polka'
import devcert from 'devcert'
import { createSecureServer } from 'http2'
import { handler as tsxHandler } from './handlers/tsx.mjs'
import { handler as cssHandler } from './handlers/cssmodules/index.mjs'
import { handler as fileHandler } from './handlers/file.mjs'
import { handler as urlHandler } from './handlers/url.mjs'
import { handler as virtualHandler } from './handlers/virtual.mjs'
import { handler as emptyListHandler } from './handlers/emptyList.mjs'
import { MemoryStorage } from './storages/MemoryStorage.mjs'
import { log } from './server/log.mjs'
import { renderPage } from './demo/server.tsx'

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

const app = polka({
  server,
  onError: (err, req, res, next) => {
    console.error(err)
    res.writeHead(err.code == 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(err.toString()) // TODO: why the body is not seen in DevTools when statusCode is not 200?
  }
})

app.use(log())

app.get(/.*\.tsx$/, emptyListHandler())

app.get(/.*\.tsx$/, tsxHandler())

app.get(/.*\.svg$/, urlHandler(), fileHandler())

// Share memory storage with esm loader
const loaderMemoryStorage = globalThis.loaderMemoryStorage // new MemoryStorage()

// Convert single .modules.css to the couple of JS and CSS files and serve them from the filesystem
app.get(/.*\.css$/, cssHandler({ storage: loaderMemoryStorage }), virtualHandler({ storage: loaderMemoryStorage }), fileHandler())

app.get(/.*.map$/, fileHandler())

// Serve node_modules as is
app.get(/\/node_modules\//, fileHandler()) // String instead of regexp removes prefix from path

// Serve built assets as is
app.get(/\/build\//, fileHandler()) // String instead of regexp removes prefix from path

app.use(renderPage)

app.listen(process.env.PORT || 443, () => {
  console.log('server ready')
})
