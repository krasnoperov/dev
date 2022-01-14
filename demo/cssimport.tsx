import { cssloader } from './cssloader.tsx'

export async function cssimport(name) {
  const module = await import(name)
  await cssloader(name)
  return module
}
