import { LocationProvider } from 'preact-iso'
// @ts-ignore
import { prerender } from '../server/prerender.mjs'
import { App } from './App.tsx'
// @ts-ignore
import LinkContext from '../server/context.mjs'
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

  const links = new Set()

  const html = (await prerender(
    <LinkContext.Provider value={links}>
      <LocationProvider url={url}><App/></LocationProvider>
    </LinkContext.Provider>
  ))

  return htmlTemplate( { html, links })
}

export async function renderPage (req, res) {
  const html = await getHtml(req.originalUrl)
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(html)
}
