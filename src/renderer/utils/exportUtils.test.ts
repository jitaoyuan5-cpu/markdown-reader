import { describe, expect, it } from 'vitest'
import { createExportDocument, toExportBaseName } from './exportUtils'

describe('exportUtils', () => {
  it('builds export base name from markdown filename', () => {
    expect(toExportBaseName('chapter-1.md')).toBe('chapter-1')
    expect(toExportBaseName('notes.markdown')).toBe('notes')
    expect(toExportBaseName('README')).toBe('README')
  })

  it('creates themed export html document', () => {
    const html = createExportDocument({
      title: '测试文档',
      htmlContent: '<h1>标题</h1><p>段落</p>',
      themeType: 'dark',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('markdown-dark')
    expect(html).toContain('#0D1117')
    expect(html).toContain('<h1>标题</h1><p>段落</p>')
  })
})
