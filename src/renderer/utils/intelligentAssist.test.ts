import { describe, expect, it } from 'vitest'
import { getReadingStats, runBasicGrammarCheck, validateMarkdownLinks } from './intelligentAssist'

describe('intelligentAssist', () => {
  it('calculates reading stats and difficulty', () => {
    const content = `
# 标题
这是一个简单的测试段落，用于验证阅读统计。
This is a straightforward test paragraph for stats.
`
    const stats = getReadingStats(content)
    expect(stats.wordCount).toBeGreaterThan(0)
    expect(stats.characterCount).toBeGreaterThan(0)
    expect(stats.estimatedMinutes).toBeGreaterThanOrEqual(1)
    expect(['简单', '中等', '较难', '困难']).toContain(stats.difficulty)
  })

  it('detects basic grammar issues', () => {
    const content = `
This is teh sample sentence.
The the issue should be detected.
What????
`
    const issues = runBasicGrammarCheck(content)
    expect(issues.some((item) => item.type === 'spelling')).toBe(true)
    expect(issues.some((item) => item.type === 'repeated-word')).toBe(true)
    expect(issues.some((item) => item.type === 'punctuation')).toBe(true)
  })

  it('validates markdown links and anchors', () => {
    const content = `
# Intro
[ok](https://example.com)
[bad](javascript:alert(1))
[anchor-miss](#missing-title)
`
    const issues = validateMarkdownLinks(content)
    expect(issues.some((item) => item.message.includes('不安全链接协议'))).toBe(true)
    expect(issues.some((item) => item.message.includes('锚点未命中'))).toBe(true)
  })
})
