import { fileURLToPath } from 'url'
import pluginutils from 'rollup-pluginutils'
import fs from 'fs'
import path from 'path'

/* Handler of express-like requests */
export function handler () {
  return (req, res, next) => {
    // skip handling if there is no ?url parameter
    if (req.query.url !== '') {
      return next()
    }

    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(`export default "${req.path}";`)
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    resolveDir = process.cwd(),
  } = options

  return {
    format: 'module',
    source: `export default "${fileURLToPath(url).replace('?url', '').replace(resolveDir, '')}";`,
  }
}

const defaultInclude = [
  '**/*\?url',
]

const filter = pluginutils.createFilter(defaultInclude)

export const rollup = (options = {}) => ({
  name: 'url',

  async resolveId(source, importer, options) {
    if (source.startsWith('./') && source.endsWith('?url')) {
      const p = path.resolve(path.dirname(importer), source.replace('?url', ''))
      return p + '?url'
    }
    return null;
  },

  async load(id) {
    if (!filter(id)) return null

    const filename = id.replace('?url', '')

    // Extract static asset
    const assetReferenceId = this.emitFile({
      type: 'asset',
      source: await fs.promises.readFile(filename.replace('?url', '')),
      name: path.basename(filename)
    })

    return {
      code: `export default import.meta.ROLLUP_FILE_URL_${assetReferenceId};`,
      moduleSideEffects: true,
      map: null
    }
  }
})
