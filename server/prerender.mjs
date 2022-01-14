import { h, options, cloneElement } from 'preact'
import renderToString from 'preact-render-to-string'

/**
 * @param {JSX.Element} vnode The root JSX element to render (eg: `<App />`)
 * @param {object} [options]
 * @param {number} [options.maxDepth = 10] The maximum number of nested asynchronous operations to wait for before flushing
 * @param {object} [options.props] Additional props to merge into the root JSX element
 */
export async function prerender (vnode, options) {
  options = options || {}

  const maxDepth = options.maxDepth || 10
  const props = options.props
  let tries = 0

  if (typeof vnode === 'function') {
    vnode = h(vnode, props)
  } else if (props) {
    vnode = cloneElement(vnode, props)
  }

  const render = () => {
    if (++tries > maxDepth) return
    try {
      return renderToString(vnode)
    } catch (e) {
      if (e && e.then) return e.then(render)
      throw e
    }
  }

  return render()
}
