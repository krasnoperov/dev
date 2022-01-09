import path from 'path'

export const safeRelativePath = (input) => path.normalize(input).replace(/^(\.\.(\/|\\|$))+/, '')
