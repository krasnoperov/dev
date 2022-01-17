import path from 'path'
import { transform } from './transform.mjs'
import { fileURLToPath } from 'url'
import pluginutils from 'rollup-pluginutils'
import fs from 'fs'
import crypto from 'crypto'
import postcss from 'postcss'
import postcssLoadConfig from 'postcss-load-config'
import { Concat } from './utils/concat.js'
import { SourceMapConsumer } from 'source-map'

/* Handler of express-like requests */
export function handler(options = {}) {
  const {
    storage
  } = options

  return async (req, res, next) => {
    try {
      if (req.originalUrl.endsWith('.module.css') || req.originalUrl.endsWith('.modules.css')) {
        await transform(storage, req.originalUrl, { loader: false })
      }
      return next()
    } catch (e) {
      console.error(e)
      next(e)
    }
  }
}

/* Node ES modules loader */
export async function loader (url, options = {}) {
  const {
    storage,
    resolveDir = process.cwd()
  } = options

  const filename = fileURLToPath(url).replace(resolveDir, '')
  await transform(storage, filename, { loader: true })

  return {
    format: 'module',
    source: (await storage.get(filename))[0],
  }
}

const defaultInclude = [
  '**/*.modules.css',
  '**/*.module.css',
]

const resolveDir = process.cwd()

const storage = null

export const rollup = (options = {}) => {
  const {
    ctx = {},
    filenamer,
    STATIC_DIR = '',
    DYNAMIC_DIR = '',
    MEDIA_DIR = '',
    META_DIR = '',
    PUBLIC_PATH = '/',
    configPath,
  } = options

  const filter = pluginutils.createFilter(defaultInclude)

  const postcssrc = postcssLoadConfig.sync(ctx, configPath)

  const sources = {}

  const emittedStylesheets = new Map()

  let postcssFromConfig

  async function reportPostcssWarnings (warnings, sourceMap) {
    if (warnings) {
      await SourceMapConsumer.with(sourceMap, null, consumer => {
        for (const warn of warnings) {
          const { source, line, column } = consumer.originalPositionFor({ line: warn.line, column: warn.column })
          const lines = consumer.sourceContentFor(source).split('\n')
          const frames = []
          for (let i = line - 2; i <= line; i++) {
            if (i >= 0 && i < lines.length) {
              frames.push(`${i + 1}: ${lines[i]}`)
            }
          }
          this.warn({ frame: frames.join('\n'), message: warn.text, loc: { file: source, line, column } })
        }
      })
    }
  }

  return {
    name: 'cssmodules',

    buildStart () {
      postcssFromConfig = postcssFromConfig || postcss(postcssrc.plugins)
    },

    async load(id) {
      if (!filter(id)) return null

      const filename = id.replace(resolveDir, '')
      const res = await transform(storage, filename, { bundler: true })

      sources[id] = res

      return {
        code: res.js,
        moduleSideEffects: 'no-treeshake',
        map: null,
      }
    },

    async generateBundle (outputOptions, bundle) {
      const hrstart = process.hrtime()
      emittedStylesheets.clear()

      for (const [entry, chunk] of Object.entries(bundle)) {
        const { type, modules } = chunk

        if (type === 'asset' || !modules) {
          continue
        }

        // Get CSS files of this chunk
        const files = new Set(Object.keys(modules).filter(file => file.endsWith('.css')))
        if (!files.size) {
          // No css files for this chunk
          continue
        }

        const name = bundle[entry].name

        // if (!updatedFiles.some(files.has, files)) {
        //   // Css files are not updated since the last run
        //   // Skip build phase and reuse previous result
        //   emittedStylesheets.set(entry, emittedStylesheetsByName.get(name))
        //   continue
        // }

        const fileName = `${name}.css`

        const concat = new Concat(fileName)

        // concatenated css and map
        for (const file of files.values()) {
          const result = sources[file]
          // const result = await postcssRenameClasses
          //   .process(source.css, {
          //     from: file,
          //     to: file,
          //     map: { annotation: false, inline: false, prev: null }
          //   })
          //
          // await reportPostcssWarnings.call(this, result.warnings(), source.map)

          await concat.add(file, result)
          await Promise.resolve()
        }

        const content = concat.getContent()
        const sourceMap = concat.getSourceMap().toJSON()

        const result = await postcssFromConfig
          .process(content, {
            from: fileName,
            to: fileName,
            map: { annotation: false, inline: false, prev: sourceMap }
          })

        await reportPostcssWarnings.call(this, result.warnings(), sourceMap)

        const hash = crypto.createHash('sha1')
          .update(result.css)
          .digest('hex')
          .substr(0, 16)

        const codeFileName = filenamer ? filenamer(hash) : `${name}.${hash}.css`
        const mapFileName = `${codeFileName}.map`

        // Some CSS parsers bail on comments in CSS, say Macaw. Thus, this. :)
        // if (sourcemap) {
          result.css += `\n/*# sourceMappingURL=${mapFileName} */`
        // }

        this.emitFile({
          type: 'asset',
          source: result.css,
          fileName: path.join(STATIC_DIR, codeFileName)
        })

        this.emitFile({
          type: 'asset',
          source: result.map.toString(),
          fileName: path.join(STATIC_DIR, mapFileName)
        })

        const publicFileName = path.join(PUBLIC_PATH, STATIC_DIR, codeFileName)

        // console.log('built', entry)
        emittedStylesheets.set(entry, publicFileName)
        // emittedStylesheetsByName.set(name, publicFileName)
      }

      const hrend = process.hrtime(hrstart)
      // console.log(`Styles generated in ${hrend[0]}s ${hrend[1] / 1000000 >> 0}ms`)
    }
  }
}

