import { LocationProvider } from 'preact-iso'
// @ts-ignore
import { prerender } from '../server/prerender.mjs'
import { App } from './App.tsx'
import AssetsContext from '../utils/AssetsContext.js'
// @ts-ignore
import htmlTemplate from './index.html.mjs'

// @ts-ignore-next
globalThis.location = {
  reload() {
    console.warn('Skipping location.reload()');
  }
};

function setLocation(url) {
  const loc = new URL(url, "https://localhost/");
  for (let i in loc) {
    try {
      if (typeof loc[i] === 'string') {
        globalThis.location[i] = String(loc[i]);
      }
    } catch (e) {}
  }
}
setLocation("https://localhost/");

export async function getHtml(url) {

  if (!AssetsContext) return

  const links = new Set<string>()

  const html = (await prerender(
    <AssetsContext.Provider value={links}>
      <LocationProvider url={url}><App/></LocationProvider>
    </AssetsContext.Provider>
  ))

  return htmlTemplate( { html, links })
}

export async function renderPage (req, res) {
  const html = await getHtml(req.originalUrl)
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(html)
}
