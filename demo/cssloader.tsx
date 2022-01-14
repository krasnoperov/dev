import { useContext } from 'preact/compat'

export async function cssloader (name, media = 'all') {
  // // @ts-ignore
  // if (!MODULES) {
  //   MODULES = JSON.parse(document.getElementById('cssImportMap').innerHTML)
  // }
  //
  // if (!MODULES[name]) {
  //   if (process.env.NODE_ENV === 'development') console.warn(`No ${name}.css css module found`)
  //   return
  // }
  //
  // return Promise.all(MODULES[name]?.map(href =>
  //   new Promise((onload, onerror) => {
  //     if (document.querySelectorAll(`link[href="${href}"]`).length) {
  //       onload(true)
  //       return
  //     }
  //
  //     const link = document.createElement('link')
  //
  //     const refs = (document.body || document.getElementsByTagName('head')[0])
  //       .childNodes
  //     const ref = refs[refs.length - 1]
  //
  //     Object.assign(link, {
  //       rel: 'stylesheet',
  //       href,
  //       onerror,
  //       onload,
  //       media,
  //     })
  //
  //     ref.parentNode.insertBefore(link, ref.nextSibling)
  //   }),
  // ))
}
