import createParser from 'postcss-selector-parser'

// regexp for `composes: className from './file.css'`
export const COMPOSES_FROM_REGEXP = /(.*)\s+from\s*['"](.*)['"]/i

const parser = createParser()

export default function plugin (opts = {}) {
  const {
    addComposes = () => {},
    addClass = () => {},
  } = opts

  function collectClasses (selector, file) {
    if (selector.type === 'class') {
      addClass(selector.value, file)
    }
    if (selector.type === 'selector') {
      for (const node of selector.nodes) {
        collectClasses(node, file)
      }
    }
  }

  function safeAddComposes (postcss, decl, className, file, composesClassName, composesRelativeFile) {
    if (composesClassName.startsWith('.')) {
      postcss.result.warn('composes should specify classnames without dots', {
        decl: decl,
        word: composesClassName
      })
      composesClassName = composesClassName.slice(1)
    }
    addComposes(className, file, composesClassName, composesRelativeFile)
  }

  return {
    postcssPlugin: 'composes',

    Once (root, postcss) {
      const file = root.source.input.file
      root.walkRules((rule) => {
        const selector = parser.astSync(rule.selector)
        for (const root of selector.nodes) {
          collectClasses(root, file)
        }
        rule.walkDecls('composes', (decl) => {
          for (const root of selector.nodes) {
            const selectors = (root.type === 'selector') ? root.nodes : [root]
            if (selectors.some(n => n.type !== 'class')) {
              throw decl.error('Only simple singular selectors may use composition', { word: decl.parent.selector })
            }
            for (const node of selectors) {
              const className = node.value
              const match = decl.value.match(COMPOSES_FROM_REGEXP)
              if (match) {
                safeAddComposes(postcss, decl, className, file, match[1], match[2])
              } else {
                for (const value of decl.value.split(',')) {
                  safeAddComposes(postcss, decl, className, file, value.trim())
                }
              }
            }
          }
        })
      })
    },
  }
}

plugin.postcss = true
