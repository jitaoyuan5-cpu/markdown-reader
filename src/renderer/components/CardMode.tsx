import React, { useEffect, useState, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Fade,
  Chip,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'
import { parseMarkdown, renderMarkdown } from '../utils/markdownParser'
import '../styles/markdown.css'
import '../styles/themes/fluid-ink.css'

interface Card {
  id: string
  title: string
  level: number
  content: string
  html: string
}

export default function CardMode() {
  const { currentFile, themeType, zoom } = useAppContext()
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentFile) return

    const parse = () => {
      const { content } = parseMarkdown(currentFile.content)
      const lines = content.split('\n')
      const sections: Card[] = []
      let currentSection: Card | null = null
      let sectionContent: string[] = []

      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (match) {
          // 保存上一个section
          if (currentSection && sectionContent.length > 0) {
            const html = renderMarkdown(sectionContent.join('\n'), themeType)
            sections.push({
              ...currentSection,
              content: sectionContent.join('\n'),
              html,
            })
          }

          // 创建新section
          const level = match[1].length
          const title = match[2].trim()
          currentSection = {
            id: `card-${sections.length}`,
            title,
            level,
            content: '',
            html: '',
          }
          sectionContent = []
        } else if (currentSection) {
          sectionContent.push(line)
        }
      }

      // 保存最后一个section
      if (currentSection && sectionContent.length > 0) {
        const html = renderMarkdown(sectionContent.join('\n'), themeType)
        sections.push({
          ...currentSection,
          content: sectionContent.join('\n'),
          html,
        })
      }

      setCards(sections)
      setCurrentIndex(0)
    }

    parse()
  }, [currentFile, themeType])

  const goToCard = (index: number) => {
    if (index < 0 || index >= cards.length) return
    setDirection(index > currentIndex ? 'right' : 'left')
    setCurrentIndex(index)
  }

  const handlePrev = () => goToCard(currentIndex - 1)
  const handleNext = () => goToCard(currentIndex + 1)

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, cards.length])

  // 触摸滑动
  useEffect(() => {
    let startX = 0
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const diff = startX - endX
      if (Math.abs(diff) > 50) {
        if (diff > 0) handleNext()
        else handlePrev()
      }
    }

    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [currentIndex, cards.length])

  if (cards.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          暂无卡片内容
        </Typography>
      </Box>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        overflow: 'hidden',
        bgcolor: 'var(--paper-bg)',
      }}
    >
      {/* 进度指示 */}
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
        {cards.map((_, index) => (
          <Box
            key={index}
            onClick={() => goToCard(index)}
            sx={{
              width: index === currentIndex ? 24 : 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              bgcolor: index === currentIndex ? 'var(--accent-primary)' : 'var(--ink-quaternary)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: index === currentIndex ? 'var(--accent-primary)' : 'var(--ink-tertiary)',
              },
            }}
          />
        ))}
      </Stack>

      {/* 卡片容器 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* 左箭头 */}
        <IconButton
          onClick={handlePrev}
          disabled={currentIndex === 0}
          sx={{
            position: 'absolute',
            left: 0,
            zIndex: 10,
            bgcolor: 'var(--paper-elevated)',
            boxShadow: '0 4px 12px var(--shadow-color)',
            border: '1px solid var(--paper-border)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: 'var(--paper-surface)',
              transform: 'translateX(-4px)',
              boxShadow: '0 6px 20px var(--shadow-color)',
            },
            '&:disabled': {
              opacity: 0.3,
            },
          }}
        >
          <ChevronLeft sx={{ color: 'var(--ink-primary)' }} />
        </IconButton>

        {/* 卡片 */}
        <Fade in={true} key={currentCard.id}>
          <Card
            elevation={0}
            sx={{
              maxWidth: 720,
              width: '100%',
              maxHeight: '70vh',
              overflow: 'auto',
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
              bgcolor: 'var(--paper-elevated)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--paper-border)',
              boxShadow: '0 8px 32px var(--shadow-color)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* 卡片头部 */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 3 }}
              >
                <Box>
                  <Chip
                    size="small"
                    label={`H${currentCard.level}`}
                    sx={{
                      mb: 1.5,
                      bgcolor: 'var(--highlight-bg)',
                      color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                    }}
                  />
                  <Typography
                    variant="h4"
                    component="h2"
                    gutterBottom
                    sx={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      color: 'var(--ink-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {currentCard.title}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    color: 'var(--ink-tertiary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {currentIndex + 1} / {cards.length}
                </Typography>
              </Stack>

              {/* 卡片内容 */}
              <Box
                className={`markdown-body markdown-${themeType}`}
                dangerouslySetInnerHTML={{ __html: currentCard.html }}
                sx={{
                  '& > *': {
                    animation: 'ink-fade-in 0.5s ease-out forwards',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Fade>

        {/* 右箭头 */}
        <IconButton
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          sx={{
            position: 'absolute',
            right: 0,
            zIndex: 10,
            bgcolor: 'var(--paper-elevated)',
            boxShadow: '0 4px 12px var(--shadow-color)',
            border: '1px solid var(--paper-border)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: 'var(--paper-surface)',
              transform: 'translateX(4px)',
              boxShadow: '0 6px 20px var(--shadow-color)',
            },
            '&:disabled': {
              opacity: 0.3,
            },
          }}
        >
          <ChevronRight sx={{ color: 'var(--ink-primary)' }} />
        </IconButton>
      </Box>

      {/* 底部信息 */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'var(--ink-tertiary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          ← → 键盘导航 · 滑动切换
        </Typography>
      </Box>
    </Box>
  )
}
