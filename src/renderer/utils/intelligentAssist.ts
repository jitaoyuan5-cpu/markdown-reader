export type DifficultyLevel = '简单' | '中等' | '较难' | '困难'

export interface ReadingStats {
  wordCount: number
  characterCount: number
  estimatedMinutes: number
  difficulty: DifficultyLevel
  difficultyScore: number
}

export type AssistIssueType = 'spelling' | 'punctuation' | 'repeated-word' | 'link'

export interface AssistIssue {
  type: AssistIssueType
  line: number
  fragment: string
  message: string
  suggestion?: string
  severity: 'warning' | 'error'
}

const COMMON_TYPO_FIXES: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  seperate: 'separate',
  occured: 'occurred',
  enviroment: 'environment',
  becuase: 'because',
  definately: 'definitely',
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
}

function stripMarkdownSyntax(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
}

function rateDifficulty(text: string): { difficulty: DifficultyLevel; score: number } {
  const sentences = text
    .split(/[。！？.!?]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const englishWords = text.match(/[A-Za-z]+/g) || []
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || []
  const totalTokens = englishWords.length + chineseChars.length
  const avgSentenceLength = sentences.length > 0 ? totalTokens / sentences.length : totalTokens
  const longWordRatio = englishWords.length
    ? englishWords.filter((item) => item.length >= 8).length / englishWords.length
    : 0

  let score = 1
  if (avgSentenceLength >= 18) score += 1
  if (avgSentenceLength >= 26) score += 1
  if (longWordRatio >= 0.2) score += 1

  if (score <= 1) return { difficulty: '简单', score }
  if (score === 2) return { difficulty: '中等', score }
  if (score === 3) return { difficulty: '较难', score }
  return { difficulty: '困难', score }
}

export function getReadingStats(content: string): ReadingStats {
  const plainText = stripMarkdownSyntax(content)
  const englishWords = plainText.match(/[A-Za-z]+/g) || []
  const chineseChars = plainText.match(/[\u4e00-\u9fff]/g) || []
  const wordCount = englishWords.length + chineseChars.length
  const characterCount = plainText.replace(/\s+/g, '').length
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 280))
  const { difficulty, score } = rateDifficulty(plainText)

  return {
    wordCount,
    characterCount,
    estimatedMinutes,
    difficulty,
    difficultyScore: score,
  }
}

export function runBasicGrammarCheck(content: string): AssistIssue[] {
  const issues: AssistIssue[] = []
  const lines = content.split('\n')

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1
    const lower = lineText.toLowerCase()

    Object.entries(COMMON_TYPO_FIXES).forEach(([typo, fix]) => {
      const regex = new RegExp(`\\b${typo}\\b`, 'i')
      if (regex.test(lower)) {
        issues.push({
          type: 'spelling',
          line: lineNumber,
          fragment: typo,
          message: `疑似拼写错误：${typo}`,
          suggestion: `建议改为 ${fix}`,
          severity: 'warning',
        })
      }
    })

    const repeatedWordMatch = lineText.match(/\b([A-Za-z]{2,})\s+\1\b/i)
    if (repeatedWordMatch) {
      issues.push({
        type: 'repeated-word',
        line: lineNumber,
        fragment: repeatedWordMatch[0],
        message: '疑似重复词',
        suggestion: `建议删除重复词 "${repeatedWordMatch[1]}"`,
        severity: 'warning',
      })
    }

    const punctuationMatch = lineText.match(/([,.;:!?])\1{2,}|([。！？])\2{1,}/)
    if (punctuationMatch) {
      issues.push({
        type: 'punctuation',
        line: lineNumber,
        fragment: punctuationMatch[0],
        message: '疑似异常标点重复',
        suggestion: '建议减少为单个或规范标点',
        severity: 'warning',
      })
    }
  })

  return issues
}

export function validateMarkdownLinks(content: string): AssistIssue[] {
  const issues: AssistIssue[] = []
  const headingAnchors = new Set<string>()
  const lines = content.split('\n')

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headingAnchors.add(slugifyHeading(match[2]))
    }
  })

  const linkRegex = /(?<!!)\[[^\]]*]\(([^)]+)\)/g
  lines.forEach((lineText, index) => {
    const lineNumber = index + 1
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(lineText)) !== null) {
      const rawTarget = match[1].trim()
      const target = rawTarget.split(/\s+/)[0].trim()

      if (!target) {
        issues.push({
          type: 'link',
          line: lineNumber,
          fragment: rawTarget,
          message: '空链接地址',
          severity: 'error',
          suggestion: '请填写有效链接地址',
        })
        continue
      }

      if (/^javascript:/i.test(target)) {
        issues.push({
          type: 'link',
          line: lineNumber,
          fragment: target,
          message: '不安全链接协议',
          severity: 'error',
          suggestion: '请使用 https/http 或站内锚点',
        })
        continue
      }

      if (target.startsWith('#')) {
        const anchor = target.slice(1).toLowerCase()
        if (!headingAnchors.has(anchor)) {
          issues.push({
            type: 'link',
            line: lineNumber,
            fragment: target,
            message: '锚点未命中当前文档标题',
            severity: 'warning',
            suggestion: '请确认标题 ID 或锚点拼写',
          })
        }
        continue
      }

      const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target)
      if (hasScheme) {
        try {
          const url = new URL(target)
          if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            issues.push({
              type: 'link',
              line: lineNumber,
              fragment: target,
              message: `非常见链接协议：${url.protocol}`,
              severity: 'warning',
              suggestion: '建议确认该协议可被阅读器正确处理',
            })
          }
        } catch {
          issues.push({
            type: 'link',
            line: lineNumber,
            fragment: target,
            message: '链接格式无效',
            severity: 'error',
            suggestion: '请检查 URL 是否完整',
          })
        }
      }
    }
  })

  return issues
}
