import path from 'path'
import fs from 'fs'

export const cssImportMap = (options = {}) => ({
  name: 'cssImportMap',

  async resolveId(source, importer, opt) {
    if (source.startsWith('build-asset-with-list-of-stylesheets:')) {
      return path.join(process.cwd(), 'build', source.replace('build-asset-with-list-of-stylesheets:', ''))
    }
    return null;
  }
})

