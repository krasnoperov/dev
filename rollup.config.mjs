import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'

import resolvePlugin from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { rollup as tsx } from './handlers/tsx.mjs'
import { rollup as url } from './handlers/url.mjs'
import { cssModules } from './handlers/cssmodules/rollup/cssModules.mjs'
import { entrypoint } from './tools/rollup-entrypoint.mjs'
import { cssImportMap } from './handlers/cssmodules/rollup/cssImportMap.mjs'
import { importAssertions } from 'acorn-import-assertions';

const BUILD_DIR = 'build'
const STATIC_DIR = 'static'
const DYNAMIC_DIR = 'dynamic'
const MEDIA_DIR = 'media'
const META_DIR = 'meta'

const output = {
  dir: BUILD_DIR,
  format: 'esm',
  sourcemap: true,
  entryFileNames: path.join('stage1', '[name].js'),
  chunkFileNames: path.join('stage1', '[name].js'),
  assetFileNames: path.join(STATIC_DIR, MEDIA_DIR, '[name].[hash].[ext]'),
}

// Sequental build of several modules
export default [

  {
    input: 'demo/client.tsx',

    external: ['preact', 'preact-iso', 'preact/jsx-runtime', 'preact/hooks' ],

    output,

    preserveEntrySignatures: true,

    // acornInjectPlugins: [ importAssertions ],

    plugins: [
      // resolvePlugin(),
      // commonjs(),
      tsx(),
      url(),
      cssModules({ STATIC_DIR, PUBLIC_PATH: '/build' }),
      entrypoint({ META_DIR }),
      // typescript(),
      // postcss({ STATIC_DIR, DYNAMIC_DIR, MEDIA_DIR, META_DIR, generateDynamics: !isLegacy }),
    ],
  },

  {
    input: 'build/stage1/client.js',
    external: ['preact', 'preact-iso', 'preact/jsx-runtime', 'preact/hooks'],
    output: {
      dir: 'build',
      format: 'esm',
      sourcemap: true,
      entryFileNames: path.join(STATIC_DIR, '[name].[hash].js'),
      chunkFileNames: path.join(STATIC_DIR, '[name].[hash].js'),
      assetFileNames: path.join(STATIC_DIR, MEDIA_DIR, '[name].[hash].[ext]'),
    },
    plugins: [
      resolvePlugin(),
      commonjs(),
      cssImportMap(),
      entrypoint({ META_DIR }),
    ],
    preserveEntrySignatures: true,
  }

].filter(Boolean)
