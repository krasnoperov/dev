import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

const shared = {
  plugins: [
    resolve({
      preferBuiltins: true,
      browser: false,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
    }),
  ],
  external: [
    /^node:/,
  ],
}

export default [
  {
    input: 'src/dev.ts',
    output: {
      file: 'dist/dev.js',
      format: 'esm',
      sourcemap: false,
      banner: '#!/usr/bin/env node',
    },
    ...shared,
  },
  {
    input: 'src/rdev.ts',
    output: {
      file: 'dist/rdev.js',
      format: 'esm',
      sourcemap: false,
      banner: '#!/usr/bin/env node',
    },
    ...shared,
  },
]
