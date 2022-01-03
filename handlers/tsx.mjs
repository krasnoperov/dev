import fs from 'fs'
import path from 'path'
import swc from '@swc/core'

export default async (args) => {
  const filename = path.join(args.resolveDir, args.path)
  const code = await fs.promises.readFile(filename, 'utf8')

  const output = await swc.transform(code, {
    filename: filename,
    configFile: true,
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
        dynamicImport: true,
      },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: 'preact',
        }
      },
      target: 'es2016',
    },
  })

  return {
    contentType: 'application/javascript; charset=utf-8',
    body: output.code
  }
}
