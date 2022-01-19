import { useContext } from 'preact/hooks'
import { lazy as preactIsoLazy } from 'preact-iso'
import AssetsContext from './AssetsContext.js'
import { cssloader } from './cssloader.mjs'
import { jsx } from 'preact/jsx-runtime'

const isServer = typeof window === 'undefined'

const styled = (jsloader, assets) => Promise.all([jsloader(), cssloader(assets)]).then(r => r[0])

/**
 * Extend lazy() with stylesheets in production mode.
 *
 * On the server it collects used stylesheets to a rendering context.
 *
 * On the client it links stylesheets to the page and waits both for imported module and loaded stylesheets.
 *
 * In development mode pass an empty or undefined list of assets and this function will do nothing.
 *
 * @param load Function with the dynamic import of desired module.
 * @param assets List of related stylesheet files.
 */
export function lazy (load, assets) {
  const component = preactIsoLazy(isServer ? load : () => styled(load, assets))
  return (props = {}) => {
    if (isServer) {
      AssetsContext && assets && useContext(AssetsContext).add(assets)
    }
    return jsx(component, props)
  }
}
