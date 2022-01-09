export function MemoryStorage() {
  const memcache = new Map()
  return {
    async get(name) {
      return memcache.get(name)
    },
    async set(name, content, contentType) {
      return memcache.set(name, [content, contentType])
    }
  }
}
