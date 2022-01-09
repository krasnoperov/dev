import sirv from 'sirv'

const CWD = process.cwd()

export function file(options={}) {
  const {
    resolveDir = CWD
  } = options

  const opts = {extensions: [], dev: true, ...options}

  return sirv(resolveDir, opts)
}
