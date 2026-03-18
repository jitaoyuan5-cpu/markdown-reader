import { FileData, ThemeType } from '../types'
import { parseMarkdown, renderMarkdown } from './markdownParser'
import { createExportDocument, toExportBaseName } from './exportUtils'

interface ExportInput {
  file: FileData | null
  themeType: ThemeType
}

interface ExportResult {
  ok: boolean
  message: string
}

export async function exportCurrentFileAsHtml({ file, themeType }: ExportInput): Promise<ExportResult> {
  if (!file) {
    return { ok: false, message: '当前没有可导出的文档' }
  }
  if (!window.electron) {
    return { ok: false, message: '当前环境不支持导出功能' }
  }

  const { content } = parseMarkdown(file.content)
  const renderedHtml = renderMarkdown(content, themeType)
  const exportHtml = createExportDocument({
    title: file.name,
    htmlContent: renderedHtml,
    themeType,
  })

  const baseName = toExportBaseName(file.name)
  const saveResult = await window.electron.showSaveDialog({
    title: '导出为 HTML',
    defaultPath: `${baseName}.html`,
    filters: [{ name: 'HTML 文件', extensions: ['html'] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { ok: false, message: '已取消导出' }
  }

  await window.electron.saveFile(saveResult.filePath, exportHtml)
  return { ok: true, message: `已导出 HTML：${saveResult.filePath}` }
}

export async function exportCurrentFileAsPdf({ file, themeType }: ExportInput): Promise<ExportResult> {
  if (!file) {
    return { ok: false, message: '当前没有可导出的文档' }
  }
  if (!window.electron) {
    return { ok: false, message: '当前环境不支持导出功能' }
  }

  const { content } = parseMarkdown(file.content)
  const renderedHtml = renderMarkdown(content, themeType)
  const exportHtml = createExportDocument({
    title: file.name,
    htmlContent: renderedHtml,
    themeType,
  })

  const baseName = toExportBaseName(file.name)
  const result = await window.electron.exportPdf({
    html: exportHtml,
    suggestedFileName: `${baseName}.pdf`,
  })

  if (result.canceled) {
    return { ok: false, message: '已取消导出' }
  }
  return { ok: true, message: `已导出 PDF：${result.filePath}` }
}
