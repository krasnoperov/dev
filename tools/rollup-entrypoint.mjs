import path from 'path'

export function entrypoint (options = {}) {
  const {
    PUBLIC_PATH = '/',
    META_DIR = '',
  } = options

  let stylesheetsApi
  return {
    name: './tools/rollup-entrypoint',

    buildStart({ plugins }) {
      const plugin = plugins.find(plugin => plugin.name === 'cssModules')
      if (plugin) {
        stylesheetsApi = plugin.api
      }
    },

    generateBundle (outputOptions, bundle) {
      for (const [key, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          this.emitFile({
            type: 'asset',
            source: JSON.stringify({
              name: chunk.name,
              facadeModuleId: chunk.facadeModuleId,
              entrypoint: path.join(PUBLIC_PATH, chunk.fileName),
              stylesheet: stylesheetsApi?.emittedStylesheets.get(key),
              isEntry: chunk.isEntry,
              isDynamicEntry: chunk.isDynamicEntry,
              imports: chunk.imports,
              dynamicImports: chunk.dynamicImports,
            }, null, 2),
            fileName: path.join(META_DIR, `${key}.chunk.json`),
          })

          if (chunk.isEntry) {
            this.emitFile({
              type: 'asset',
              source: JSON.stringify({
                entrypoint: key,
              }, null, 2),
              fileName: path.join(META_DIR, `${chunk.name}.entry.json`),
            })
          }
        }
      }
    },
  }
}
