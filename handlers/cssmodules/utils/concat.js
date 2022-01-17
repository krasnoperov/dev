import { SourceMapConsumer, SourceMapGenerator } from 'source-map'

export class Concat {
  constructor (fileName) {
    this.lineOffset = 0
    this.contentParts = []
    this.sourceMap = new SourceMapGenerator({ file: fileName })
  }

  async add (filePath, content) {
    const { css, map } = content
    this.contentParts.push(Buffer.from(css))
    this.contentParts.push(Buffer.from('\n'))

    let lines = 0
    for (let i = 0; i < css.length; ++i) {
      if (css[i] === '\n') {
        lines++
      }
    }

    const upstreamSM = await (new SourceMapConsumer(map.toJSON()))
    upstreamSM.eachMapping((mapping) => {
      if (mapping.source) {
        this.sourceMap.addMapping({
          generated: {
            line: this.lineOffset + mapping.generatedLine,
            column: mapping.generatedColumn,
          },
          // eslint-disable-next-line multiline-ternary
          original: mapping.originalLine == null ? null : {
            line: mapping.originalLine,
            column: mapping.originalColumn,
          },
          source: mapping.originalLine != null ? mapping.source : null,
          name: mapping.name,
        })
      }
    })

    if (upstreamSM.sourcesContent) {
      upstreamSM.sourcesContent.forEach((sourceContent, i) => {
        this.sourceMap.setSourceContent(upstreamSM.sources[i], sourceContent)
      })
    }

    upstreamSM.destroy()
    this.lineOffset += lines + 1
  }

  getContent () {
    return Buffer.concat(this.contentParts)
  }

  getSourceMap () {
    return this.sourceMap
  }
}
