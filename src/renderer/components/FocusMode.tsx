import React, { useEffect, useState } from 'react'
import {
  Box,
  IconButton,
  Paper,
  Fade,
  Tooltip,
} from '@mui/material'
import {
  FullscreenExit,
  ZoomIn,
  ZoomOut,
  Brightness4,
  Brightness7,
} from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'
import { parseMarkdown, renderMarkdown } from '../utils/markdownParser'
import '../styles/markdown.css'
import '../styles/themes/fluid-ink.css'

interface FocusModeProps {
  onExit: () => void
}

export default function FocusMode({ onExit }: FocusModeProps) {
  const { currentFile, themeType, setThemeType } = useAppContext()
  const [content, setContent] = useState('')
  const [zoom, setZoom] = useState(1.2)
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    if (!currentFile) return

    const parse = () => {
      const { content } = parseMarkdown(currentFile.content)
      const html = renderMarkdown(content, themeType)
      setContent(html)
    }

    parse()
  }, [currentFile, themeType])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onExit()
          break
        case 'ArrowUp':
          window.scrollBy({ top: -100, behavior: 'smooth' })
          break
        case 'ArrowDown':
          window.scrollBy({ top: 100, behavior: 'smooth' })
          break
        case '+':
        case '=':
          if (e.ctrlKey) {
            e.preventDefault()
            setZoom((z) => Math.min(z + 0.1, 2))
          }
          break
        case '-':
          if (e.ctrlKey) {
            e.preventDefault()
            setZoom((z) => Math.max(z - 0.1, 0.5))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  if (!currentFile) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'var(--paper-bg)',
        zIndex: 9999,
        overflow: 'auto',
        cursor: showControls ? 'default' : 'none',
      }}
      onMouseMove={() => {
        if (!showControls) {
          setShowControls(true)
          setTimeout(() => setShowControls(false), 3000)
        }
      }}
    >
      {/* 悬浮控制条 */}
      <Fade in={showControls}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            p: 1.5,
            borderRadius: 'var(--radius-2xl)',
            bgcolor: 'var(--glass-bg, rgba(255,255,255,0.85))',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px var(--shadow-color)',
            border: '1px solid var(--paper-border)',
            zIndex: 10000,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Tooltip title="退出专注模式 (Esc)">
            <IconButton
              onClick={onExit}
              sx={{
                color: 'var(--ink-secondary)',
                '&:hover': {
                  color: 'var(--ink-primary)',
                  bgcolor: 'var(--hover-bg)',
                },
              }}
            >
              <FullscreenExit />
            </IconButton>
          </Tooltip>

          <Tooltip title="缩小">
            <IconButton
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
              sx={{
                color: 'var(--ink-secondary)',
                '&:hover': {
                  color: 'var(--ink-primary)',
                  bgcolor: 'var(--hover-bg)',
                },
              }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>

          <Tooltip title="放大">
            <IconButton
              onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
              sx={{
                color: 'var(--ink-secondary)',
                '&:hover': {
                  color: 'var(--ink-primary)',
                  bgcolor: 'var(--hover-bg)',
                },
              }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>

          <Tooltip title="切换主题">
            <IconButton
              onClick={() =>
                setThemeType(themeType === 'light' ? 'dark' : 'light')
              }
              sx={{
                color: 'var(--ink-secondary)',
                '&:hover': {
                  color: 'var(--ink-primary)',
                  bgcolor: 'var(--hover-bg)',
                },
              }}
            >
              {themeType === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>

      {/* 内容 */}
      <Paper
        elevation={0}
        sx={{
          maxWidth: 760,
          mx: 'auto',
          my: 8,
          p: 6,
          bgcolor: 'transparent',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className={`markdown-body markdown-${themeType}`}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Paper>
    </Box>
  )
}
