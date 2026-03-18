import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { parseMarkdown, renderMarkdown, getLastOutline } from '../utils/markdownParser'
import '../styles/markdown.css'
import '../styles/themes/fluid-ink.css'

const applyPersistentHighlights = (html: string, highlightTexts: string[]): string => {
  if (highlightTexts.length === 0) {
    return html
  }

  const container = document.createElement('div')
  container.innerHTML = html

  highlightTexts.forEach((term, index) => {
    const normalizedTerm = term.trim()
    if (!normalizedTerm) {
      return
    }

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    let node: Node | null = null

    while ((node = walker.nextNode())) {
      const textNode = node as Text
      const parentElement = textNode.parentElement
      if (!parentElement) {
        continue
      }

      const parentTag = parentElement.tagName.toLowerCase()
      if (['code', 'pre', 'script', 'style'].includes(parentTag)) {
        continue
      }

      const text = textNode.textContent || ''
      const matchIndex = text.indexOf(normalizedTerm)
      if (matchIndex === -1) {
        continue
      }

      const parent = textNode.parentNode
      if (!parent) {
        continue
      }

      const before = text.slice(0, matchIndex)
      const matched = text.slice(matchIndex, matchIndex + normalizedTerm.length)
      const after = text.slice(matchIndex + normalizedTerm.length)

      if (before) {
        parent.insertBefore(document.createTextNode(before), textNode)
      }

      const span = document.createElement('span')
      span.className = 'fm-user-highlight'
      span.setAttribute('data-highlight-id', `highlight-${index}`)
      span.textContent = matched
      parent.insertBefore(span, textNode)

      if (after) {
        parent.insertBefore(document.createTextNode(after), textNode)
      }

      parent.removeChild(textNode)
      break
    }
  })

  return container.innerHTML
}

export default function MarkdownViewer() {
  const {
    currentFile,
    themeType,
    zoom,
    setOutline,
    setBookmarks,
    highlights,
    setHighlights,
    searchQuery,
    setSearchResults,
  } = useAppContext()

  const contentRef = useRef<HTMLDivElement>(null)
  const [parsedContent, setParsedContent] = useState('')
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false)
  const [pendingSelection, setPendingSelection] = useState('')
  const [noteInput, setNoteInput] = useState('')

  // 解析 Markdown 并提取大纲
  useEffect(() => {
    if (!currentFile) {
      setParsedContent('')
      setOutline([])
      return
    }

    try {
      const { content } = parseMarkdown(currentFile.content)
      const html = renderMarkdown(content, themeType)
      const highlightedHtml = applyPersistentHighlights(
        html,
        highlights.map((item) => item.text),
      )
      setParsedContent(highlightedHtml)

      // 从渲染器获取大纲（确保ID匹配）
      const outline = getLastOutline()
      setOutline(outline)
    } catch (error) {
      console.error('Failed to parse markdown:', error)
      setParsedContent(`<p style="color: red;">解析失败: ${error}</p>`)
      setOutline([])
    }
  }, [currentFile, themeType, setOutline, highlights])

  // 处理代码块复制
  useEffect(() => {
    if (!contentRef.current) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('copy-code-btn')) {
        const code = target.getAttribute('data-code')
        if (code) {
          navigator.clipboard.writeText(code)
          setShowCopyToast(true)
          setTimeout(() => setShowCopyToast(false), 2000)
        }
      }
    }

    contentRef.current.addEventListener('click', handleClick)
    return () => {
      contentRef.current?.removeEventListener('click', handleClick)
    }
  }, [parsedContent])

  // 处理搜索高亮
  useEffect(() => {
    if (!contentRef.current || !searchQuery) {
      // 清除高亮
      if (contentRef.current) {
        const highlights = contentRef.current.querySelectorAll('.search-highlight')
        highlights.forEach((el) => {
          const parent = el.parentNode
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent || ''), el)
            parent.normalize()
          }
        })
      }
      return
    }

    const results: { index: number; text: string; context: string }[] = []
    let index = 0

    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    const textNodes: Text[] = []
    let node
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text)
    }

    // 获取当前主题的主强调色
    const isDark = themeType === 'dark' || themeType === 'midnight'
    const highlightBg = isDark ? 'rgba(224, 122, 120, 0.3)' : 'rgba(199, 62, 58, 0.15)'
    const highlightColor = isDark ? '#E8E4DF' : '#2C2C2C'

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || ''
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = text.match(regex)

      if (matches) {
        const parent = textNode.parentNode
        if (!parent) return

        let lastIndex = 0
        let match
        regex.lastIndex = 0

        while ((match = regex.exec(text)) !== null) {
          const before = text.slice(lastIndex, match.index)
          if (before) {
            parent.insertBefore(document.createTextNode(before), textNode)
          }

          const span = document.createElement('span')
          span.className = 'search-highlight'
          span.style.backgroundColor = highlightBg
          span.style.color = highlightColor
          span.style.borderRadius = '2px'
          span.style.padding = '0 2px'
          span.textContent = match[0]
          parent.insertBefore(span, textNode)

          results.push({
            index: index++,
            text: match[0],
            context: text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20),
          })

          lastIndex = regex.lastIndex
        }

        const after = text.slice(lastIndex)
        if (after) {
          parent.insertBefore(document.createTextNode(after), textNode)
        }

        parent.removeChild(textNode)
      }
    })

    setSearchResults(results)
  }, [searchQuery, parsedContent, setSearchResults, themeType])

  // 处理文本选中添加书签
  const handleSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    if (!selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    if (!contentRef.current?.contains(container)) return

    const text = selection.toString().trim()
    if (text.length < 2) return

    setPendingSelection(text.slice(0, 500))
    setNoteInput('')
    setAnnotationDialogOpen(true)
  }

  const handleSaveAnnotation = () => {
    if (!pendingSelection) {
      return
    }

    const scrollContainer = document.getElementById('markdown-scroll-container')
    const position = scrollContainer?.scrollTop ?? window.scrollY
    const annotationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const note = noteInput.trim()

    setHighlights((prev) => [
      {
        id: annotationId,
        text: pendingSelection,
        color: 'var(--highlight-bg)',
        position,
      },
      ...prev,
    ])

    setBookmarks((prev) => [
      {
        id: annotationId,
        text: pendingSelection,
        note: note || undefined,
        position,
        createdAt: new Date(),
      },
      ...prev,
    ])

    setAnnotationDialogOpen(false)
    setPendingSelection('')
    setNoteInput('')
    window.getSelection()?.removeAllRanges()
  }

  const handleCloseAnnotationDialog = () => {
    setAnnotationDialogOpen(false)
    setPendingSelection('')
    setNoteInput('')
    window.getSelection()?.removeAllRanges()
  }

  return (
    <Box
      id="markdown-scroll-container"
      className="paper-texture"
      sx={{
        height: '100%',
        overflow: 'auto',
        bgcolor: 'var(--paper-bg)',
        backgroundImage: 'var(--paper-texture)',
      }}
    >
      <Paper
        elevation={0}
        className="ink-reveal"
        sx={{
          maxWidth: 760,
          mx: 'auto',
          my: { xs: 2, sm: 4, md: 6 },
          p: { xs: 3, sm: 4, md: 6 },
          minHeight: 'calc(100vh - 200px)',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease, box-shadow 0.3s ease',
          bgcolor: 'var(--paper-elevated)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--paper-border)',
          boxShadow: '0 4px 24px var(--shadow-color)',
        }}
      >
        <div
          ref={contentRef}
          className={`markdown-body markdown-${themeType}`}
          dangerouslySetInnerHTML={{ __html: parsedContent }}
          onMouseUp={handleSelection}
        />
      </Paper>

      {/* Copy Toast */}
      <Fade in={showCopyToast}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'var(--accent-success)',
            color: '#fff',
            px: 3,
            py: 1.5,
            borderRadius: 'var(--radius-md)',
            zIndex: 9999,
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          代码已复制到剪贴板
        </Box>
      </Fade>

      <Dialog
        open={annotationDialogOpen}
        onClose={handleCloseAnnotationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加标记与备注</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="已选文本"
            value={pendingSelection}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="备注（可选）"
            placeholder="输入你的备注..."
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAnnotationDialog}>取消</Button>
          <Button variant="contained" onClick={handleSaveAnnotation}>
            保存标记
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
