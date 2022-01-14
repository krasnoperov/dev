export const log = () => {
  function handler () {
    try {
      const res = this
      const req = res.req
      const elapsed = process.hrtime(res.start)
      const ms = Math.ceil((elapsed[0] * 1e3) + (elapsed[1] * 1e-6))

      // Log to console
      console.log(`${res.statusCode} ${req.method} ${req.originalUrl} - ${ms}ms`) // eslint-disable-line no-console
    } catch (e) {
      console.error(e) // ignore
    }
  }

  return (req, res, next) => {
    res.start = process.hrtime()
    res.on('finish', handler)
    next()
  }
}
