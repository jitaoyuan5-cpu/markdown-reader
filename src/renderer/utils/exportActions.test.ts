import { describe, expect, it } from 'vitest'
import { exportCurrentFileAsHtml, exportCurrentFileAsPdf } from './exportActions'

describe('exportActions', () => {
  it('returns error when no current file', async () => {
    const htmlResult = await exportCurrentFileAsHtml({ file: null, themeType: 'light' })
    const pdfResult = await exportCurrentFileAsPdf({ file: null, themeType: 'light' })

    expect(htmlResult.ok).toBe(false)
    expect(pdfResult.ok).toBe(false)
    expect(htmlResult.message).toContain('没有可导出的文档')
    expect(pdfResult.message).toContain('没有可导出的文档')
  })

  it('returns unsupported message outside electron', async () => {
    const file = { path: '/tmp/a.md', name: 'a.md', content: '# title' }
    const originalElectron = window.electron
    ;(window as Window & { electron?: unknown }).electron = undefined

    const result = await exportCurrentFileAsHtml({ file, themeType: 'light' })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('不支持导出')

    ;(window as Window & { electron?: unknown }).electron = originalElectron
  })
})
