import createParser from 'postcss-selector-parser'
import path from 'path'
import { COMPOSES_FROM_REGEXP } from './collectClasses.mjs'

const parser = createParser()

export default function plugin (opts = {}) {
  const {
    findClass = (className, file) => '',
  } = opts

  function renameClasses (selector, file, postcss) {
    if (selector.type === 'class') {
      const className = findClass(selector.value, file)
      selector.replaceWith(createParser.className({ value: className }))
    } else if (selector.type === 'pseudo') {
      if (selector.value === ':external') {
        // :external(classname from './file.css')
        if (selector.nodes.length !== 1 || selector.nodes[0].nodes.length !== 5 ||
          selector.nodes[0].nodes[0].type !== 'tag' ||
          selector.nodes[0].nodes[2].type !== 'tag' || selector.nodes[0].nodes[2].value !== 'from' ||
          selector.nodes[0].nodes[4].type !== 'string') {
          throw new Error('Wrong format of :external selector')
        }

        const value = selector.nodes[0].nodes[0].value
        const from = selector.nodes[0].nodes[4].value
        const className = findClass(value, path.resolve(path.dirname(file), from.slice(1, from.length - 1)))
        selector.replaceWith(createParser.className({ value: className }))
      } else if (selector.value === ':global') {
        selector.replaceWith(selector.nodes)
      }
    } else if (selector.type === 'selector') {
      for (const node of selector.nodes) {
        renameClasses(node, file, postcss)
      }
    }
  }

  return {
    postcssPlugin: 'rename-classes',

    Once (root, postcss) {
      const file = root.source.input.file

      root.walkRules((rule) => {
        const selector = parser.astSync(rule.selector)
        for (const root of selector.nodes) {
          try {
            renameClasses(root, file, postcss)
          } catch (e) {
            postcss.result.warn(e.message, {
              node: rule,
              word: root.value,
            })
          }
        }

        rule.walkDecls('composes', (decl) => {
          const match = decl.value.match(COMPOSES_FROM_REGEXP)
          if (match) {
            for (const root of selector.nodes) {
              const selectors = (root.type === 'selector') ? root.nodes : [root]
              for (const node of selectors) {
                const value = match[1]
                const from = match[2]
                const composesNode = createParser.className({ value: findClass(value, path.resolve(path.dirname(file), from)) })
                if (node.type === 'selector') {
                  node.replaceWith(composesNode, ...node.nodes)
                } else {
                  node.replaceWith(composesNode, node)
                }
              }
            }
          }
          decl.remove()
        })
        rule.selector = selector.toString()
      })
    },

  }
}

plugin.postcss = true
