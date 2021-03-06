/**
 * ESM Loader that allows import of images and CSS Modules
 */

import path from 'path'
import fs from 'fs'
import { MemoryStorage } from '../storages/MemoryStorage.mjs'
import { loader as cssLoader } from '../handlers/cssmodules/index.mjs'
import { loader as tsxLoader } from '../handlers/tsx.mjs'
import { loader as urlLoader } from '../handlers/url.mjs'
import { loader as emptyLoader } from '../handlers/empty.mjs'
import { loader as losLoader } from '../handlers/los.mjs'

// import { BASE_PATH, loadAssets } from './loadAssets.js'
// import sucrase from 'sucrase'

// const staticFiles = loadAssets('build/meta/static.json')

const EXTENSIONS = new Set([
  // Supported static files from tools/rollup-statics.js
  '.ico',
  '.svg',
  '.png',
  '.jpg',
  '.gif',
  '.pdf',
  '.opus',
])

// const BASE_URL = pathToFileURL(BASE_PATH).href

// const GENERATED_STYLES_PATH = path.join(BASE_PATH, 'build/dynamic')

globalThis.loaderMemoryStorage = new MemoryStorage()

export async function resolve (specifier, context, defaultResolver) {
  const { parentURL } = context
  const ext = path.extname(specifier)
  if (ext === '.css') {
    return {
      url: ((parentURL) ? new URL(specifier, parentURL).href : new URL(specifier).href)
    }
  }
  return defaultResolver(specifier, context, defaultResolver)
}

export async function load (url, context, defaultLoad) {
  const extname = path.extname(url)

  if (extname === '.tsx?list-of-stylesheets') {
    return losLoader(url)
  }

  if (extname === '.tsx') {
    return tsxLoader(url)
  }

  if (extname === '.svg?url') {
    return urlLoader(url)
  }

  /* Transform CSS Modules to JS files with classnames */
  if (url.endsWith('.module.css')) {
    return cssLoader(url, { storage: globalThis.loaderMemoryStorage })
  }

  /* Transform plain .css files to an empty objects */
  if (extname == '.css') {
    return emptyLoader(url)
  }

  // Let Node.js handle all other sources.
  return defaultLoad(url, context, defaultLoad)
}
