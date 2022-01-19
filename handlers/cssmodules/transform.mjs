import path from 'path'
import fs from 'fs'
import url from 'url'
import postcss from 'postcss'
import nesting from 'postcss-nesting'
import identifierfy from 'identifierfy'
import collectClasses from './postcss/collectClasses.mjs'
import renameClasses from './postcss/renameClasses.mjs'
import { namer } from './utils/namer.mjs'
import { fileURLToPath, pathToFileURL, URL } from 'url'
import process from 'process'

const DEVELOPMENT_FILE_PREFIX = '/.virtual'

function generateClassName (record, records, imports, classname = []) {
  for (const compose of record.composes) {
    if (compose.from) {
      const importName = identifierfy(compose.name + compose.from)
      const importLine = `import { ${(identifierfy(compose.name))} as ${importName} } from '${compose.from}';`
      if (imports.indexOf(importLine) === -1) {
        imports.push(importLine)
      }
      classname.push(importName)
    } else {
      if (!records[compose.name]) {
        this.warn({ message: 'Unknown class "' + compose.name + '"' })
        classname.push(`"${compose.name}"`)
      } else {
        generateClassName(records[compose.name], records, imports, classname)
      }
    }
  }
  classname.push(`"${record.name}"`)
  return classname
}

const resolveDir = process.cwd()

const classnames = {}

const postcssCollectClasses = postcss([
  nesting(),
  // postcss_simple_vars({ variables }),
  collectClasses({
    addClass: (className, file) => {
      if (!classnames[file]) {
        classnames[file] = {}
      }
      if (!classnames[file][className]) {
        classnames[file][className] = {
          name: namer(file, className),
          composes: [],
        }
      }
    },
    addComposes: (className, file, composesClassName, composesRelativeFile) => {
      if (composesRelativeFile) {
        // Compose from an external file
        classnames[file][className].composes.push({
          name: composesClassName,
          from: composesRelativeFile,
        })
      } else {
        // Compose from the same file
        classnames[file][className].composes.push({
          name: composesClassName,
        })
      }
    },
  }),
  renameClasses({
    findClass: (className, file) => {
      return namer(file, className)
    },
  }),
])

export async function transform (storage, filename, options) {

  const {
    mode = '',
  } = options

  const isDevelopment = process.env.NODE_ENV === 'development'

  const file = path.join(resolveDir, filename)
  const code = await fs.promises.readFile(file, 'utf8')

  const cssFilename = path.join(DEVELOPMENT_FILE_PREFIX, filename.replace(/\.modules?\.css/, '.css'))

  // Collect classnames
  classnames[file] = {}

  const res = await postcssCollectClasses
    .process(code, {
      from: file,
      to: file,
      map: { annotation: false, inline: false }
    })

  // Generate JS file with processed classnames
  const lines = []

  // NOTE: currently names exports are not supported because of DEVELOPMENT SERVER HACK
  // const exports = [] // Named exports to support imports

  const defaultExport = [] // Default exports to use in JS code


  // DEVELOPMENT SERVER: Collect urls of used stylesheets during rendering
  if (isDevelopment && mode === 'nodeLoader') {

    // Get absolute path of AssetsContext.js module
    const contextAbsolutePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../utils/AssetsContext.js')
    // Make it relative to source .module.css file
    const contextImportPath = path.relative(path.dirname(file), contextAbsolutePath)

    lines.push(
      `import { useContext } from 'preact/hooks';`,
      `import AssetsContext from '${contextImportPath}';`,
    )
  }

  const records = classnames[file]
  for (const className in records) {
    const identifier = identifierfy(className)

    // NOTE: additional imports of related .modules.css may be added here
    // NOTE: value depends from process.env.NODE_ENV, see ./namer.js
    const value = generateClassName(records[className], records, lines).join('+" "+')

    let keyValue = `"${className}": ${value},`

    // DEVELOPMENT SERVER HACK: hack into classname resolution to mark stylesheet file as used
    // NOTE: better ideas are welcome!
    if (isDevelopment && mode === 'nodeLoader') {
      keyValue = `get "${className}" () { useContext(AssetsContext).add('${cssFilename}'); return ${value}}`
    }

    defaultExport.push(keyValue)
  }

  // DEVELOPMENT CLIENT: Serve stylesheets as a `CSS Module Scripts` and attach them using `document.adoptedStyleSheets`
  // https://developers.google.com/web/updates/2019/02/constructable-stylesheets#using_constructed_stylesheets
  if (isDevelopment && mode === 'httpHandler') {
      lines.push(
        `import __styles from "${cssFilename}" assert { type: 'css' };`,
        `document.adoptedStyleSheets = [...document.adoptedStyleSheets, __styles];`
      )
  }

  lines.push(`export default {${defaultExport.join('\n')}};`)

  const jsContent = lines.join('\n')

  storage && storage.set(filename, jsContent, 'application/javascript; charset=utf-8')

  // Store result file to the shared storage, so it becomes possible to download it by its own url.
  storage && storage.set(cssFilename, res.css, 'text/css; charset=utf-8')

  storage && storage.set(cssFilename+ '.map', res.map.toJSON(), 'text/sourceMap')

  return {
    css: res.css,
    map: res.map,
    js: jsContent
  }
}
