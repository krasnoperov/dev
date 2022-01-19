import { createContext } from 'preact'

const isServer = typeof window === 'undefined'

const assetsContext =
  isServer
    ? createContext()
    : undefined

export default assetsContext
