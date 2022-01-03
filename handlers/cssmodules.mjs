import path from 'path'
import fs from 'fs'
import postcss from 'postcss'
import nesting from 'postcss-nesting'
import identifierfy from 'identifierfy'
import collectClasses from '../postcss/collectClasses.mjs'
import renameClasses from '../postcss/renameClasses.mjs'
import { namer } from '../utils/namer.mjs'

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

const rootDir = process.cwd()

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

const cache = new Map()

// TODO: fix params
export async function generate (filename, file) {
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

  const records = classnames[file]
  for (const className in records) {
    const identifier = identifierfy(className)
    const value = generateClassName(records[className], records, imports).join('+" "+')
    exports.push(`export const ${identifier} = ${value};`)
    defaultExport.push(`"${className}":${identifier}`)
  }

  const jsContent = [
    `import __styles from "${filename + '?css'}" assert { type: 'css' };`,
    'document.adoptedStyleSheets = [...document.adoptedStyleSheets, __styles];',
    imports.join('\n'),
    exports.join('\n'),
    `export default {${defaultExport.join(',')}};`,
  ].join('\n')

  cache.set(filename, {
    contentType: 'application/javascript; charset=utf-8',
    body: jsContent
  })

  cache.set(filename + '?css', {
    contentType: 'text/css; charset=utf-8',
    body: res.css
  })

  cache.set(filename + '.map', {
    contentType: 'text/sourceMap',
    body: res.map.toJSON()
  })
}

export default async (args) => {
  const filename = path.join(args.resolveDir, args.path)

  if (cache.has(args.path)) {
    return cache.get(args.path)
  }

  await generate(args.path, filename)

  const result = cache.get(args.path)
  return result
}
