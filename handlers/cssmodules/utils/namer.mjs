import crypto from 'crypto'
import path from 'path'
import process from 'process'

const keyToHash = new Map()
const hashes = new Map()

// NOTE: In case of collision try to change constants below:
const HASH_START = 0 // At first, try to change start position, perhaps you can deal with collision without increasing hash length
const SELECTOR_HASH_LENGTH = 3 // Then try to increase length of hash suffix. Increase to 4 should fix the issue
const FILENAME_HASH_LENGTH = 3 // If nothing helps, try to increase length of common hash prefix

const getHash = (s, length) => parseInt(crypto.createHash('sha1').update(s).digest('hex').substr(HASH_START, length), 16).toString(36)

const CHARS = 'ABCDEFGHIJ'

const BASE_PATH = process.cwd()

// Generate as short as possible unique class names
// It is not possible to generate sequential hashes, so we have to use hashes
export function namer (filename, selector) {
  const base = path.relative(BASE_PATH, filename)

  const key = base + ':' + selector

  let hash = keyToHash.get(key)

  if (!hash) {
    hash = getHash(base, FILENAME_HASH_LENGTH) + getHash(base + ':' + selector, SELECTOR_HASH_LENGTH)
    // A JavaScript identifier must start with a letter, underscore (_), or dollar sign ($)
    if (Number.isInteger(parseInt(hash[0]))) {
      hash = CHARS[hash[0]] + hash.substring(1)
    }

    // Check hash for collisions
    if (hashes.has(hash)) {
      throw new Error(`Classname hash ${hash} collision for key ${key} and ${hashes.get(hash)}, increase hash length in tools/utils/namer.js or rename selector`)
    }
    hashes.set(hash, key)

    // Cache hash for tiny performance boost
    keyToHash.set(key, hash)
  }
  if (process.env.NODE_ENV === 'development') {
    return path.basename(filename, path.extname(filename)).replace(/[:/\\ .]/g, '') + '_' + selector + '_' + hash
  }

  return hash
}
