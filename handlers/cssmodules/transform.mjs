import path from 'path'
import fs from 'fs'
import url from 'url'
import postcss from 'postcss'
import nesting from 'postcss-nesting'
import identifierfy from 'identifierfy'
import collectClasses from './postcss/collectClasses.mjs'
import renameClasses from './postcss/renameClasses.mjs'
import { namer } from './namer.mjs'
import { fileURLToPath, pathToFileURL, URL } from 'url'
import process from 'process'

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
    loader = false // generate code for ESM loader within node server
  } = options

  const file = path.join(resolveDir, filename)
  const code = await fs.promises.readFile(file, 'utf8')

  // Collect classnames
  classnames[file] = {}

  const res = await postcssCollectClasses
    .process(code, {
      from: file,
      to: file,
      map: { annotation: false, inline: false }
    })

  // Generate JS file with processed classnames

  const imports = [] // Import is used as a native way to tell rollup about dependencies between CSS files
  const exports = [] // Named exports to support imports
  const defaultExport = [] // Default exports to use in JS code

  const cssFilename = path.join('/.virtual/', filename.replace(/\.modules?\.css/, '.css'))

  const records = classnames[file]
  for (const className in records) {
    const identifier = identifierfy(className)
    const value = generateClassName(records[className], records, imports).join('+" "+')
    if (loader) {
      defaultExport.push(`get "${className}" () { useContext(LinkContext).add('${cssFilename}'); return ${value}}`)
    } else {
      defaultExport.push(`"${className}": ${value},`)
    }
  }

  const contextAbsolutePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../server/context.mjs')
  const contextImportPath = path.relative(path.dirname(file), contextAbsolutePath)

  if (!loader) {
    imports.push(
      `import __styles from "${cssFilename}" assert { type: 'css' };`,
    )
  }

  if (loader) {
    imports.push(
      'import { useContext } from \'preact/compat\';',
      `import LinkContext from \'${contextImportPath}\';`,
    )
  }

  const jsContent = [
    imports.join('\n'),
    !loader ? 'document.adoptedStyleSheets = [...document.adoptedStyleSheets, __styles];' : '',
    exports.join('\n'),
    `export default {${defaultExport.join('\n')}};`,
  ].join('\n')

  storage.set(filename, jsContent, 'application/javascript; charset=utf-8')

  storage.set(cssFilename, res.css, 'text/css; charset=utf-8')

  storage.set(cssFilename+ '.map', res.map.toJSON(), 'text/sourceMap')
}
