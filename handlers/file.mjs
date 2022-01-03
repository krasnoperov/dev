import fs from 'fs'
import path from 'path'
import { contentType } from 'mime-types'

export default async (args) => {
  const filename = path.join(args.resolveDir, args.path)
  const body = await fs.promises.readFile(filename, 'utf8')
  return {
    contentType: contentType(path.basename(filename)) || 'application/octet-stream',
    body
  }
}
