import { marked } from 'marked'
import { ThemeType, ParsedMarkdown, OutlineItem } from '../types'

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
})

// 简单的 Front Matter 解析器（不依赖 gray-matter）
function parseFrontMatter(content: string): { data: Record<string, any>; content: string } {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(fmRegex)

  if (!match) {
    return { data: {}, content }
  }

  const fmContent = match[1]
  const bodyContent = match[2]

  const data: Record<string, any> = {}
  const lines = fmContent.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      let value: any = line.slice(colonIndex + 1).trim()

      // 尝试解析数组 [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
        } catch {
          // 保持原字符串
        }
      }
      // 去除字符串引号
      else if ((value.startsWith('"') && value.endsWith('"')) ||
               (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      data[key] = value
    }
  }

  return { data, content: bodyContent }
}

export function parseMarkdown(content: string): ParsedMarkdown {
  const parsed = parseFrontMatter(content)

  return {
    frontMatter: parsed.data,
    content: parsed.content,
    title: parsed.data.title,
    author: parsed.data.author,
    date: parsed.data.date,
    tags: parsed.data.tags,
  }
}

// 生成与 marked 兼容的 ID
function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// 存储解析过程中的大纲
let currentOutline: OutlineItem[] = []

export function renderMarkdown(content: string, theme: ThemeType = 'light'): string {
  try {
    currentOutline = []

    // 创建自定义渲染器
    const renderer = new marked.Renderer()

    // 自定义标题渲染 - 生成 ID 并记录大纲
    renderer.heading = (text: string, level: number, raw: string) => {
      const id = generateId(raw)
      currentOutline.push({ level, text: raw, id })
      return `<h${level} id="${id}">${text}</h${level}>`
    }

    // 使用自定义渲染器解析
    const html = marked.parse(content, { renderer }) as string
    return html
  } catch (error) {
    console.error('Markdown render error:', error)
    return `<p style="color: red;">渲染错误: ${error}</p>`
  }
}

// 获取最后一次渲染的大纲
export function getLastOutline(): OutlineItem[] {
  return currentOutline
}

// 提取大纲（从原始内容，用于预览）
export function extractOutline(content: string): OutlineItem[] {
  const outline: OutlineItem[] = []
  const lines = content.split('\n')

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = generateId(text)
      outline.push({ level, text, id })
    }
  })

  return outline
}

// 计算阅读时间
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 300
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
  const totalWords = chineseChars + englishWords
  return Math.ceil(totalWords / wordsPerMinute)
}

// 计算字数统计
export function calculateStats(content: string) {
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
  const totalChars = content.length
  const lines = content.split('\n').length

  return {
    chineseChars,
    englishWords,
    totalChars,
    lines,
    readingTime: Math.ceil((chineseChars + englishWords) / 300),
  }
}
