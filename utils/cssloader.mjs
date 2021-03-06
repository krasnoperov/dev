const isServer = typeof window === 'undefined'

export async function cssloader (assets, media = 'all') {
  if (isServer) return

  return Promise.all(assets?.map(href =>
    new Promise((onload, onerror) => {
      if (document.querySelectorAll(`link[href="${href}"]`).length) {
        onload(true)
        return
      }

      const link = document.createElement('link')

      const refs = (document.body || document.getElementsByTagName('head')[0])
        .childNodes
      const ref = refs[refs.length - 1]

      Object.assign(link, {
        rel: 'stylesheet',
        href,
        onerror,
        onload,
        media,
      })

      ref.parentNode.insertBefore(link, ref.nextSibling)
    }),
  ))
}
