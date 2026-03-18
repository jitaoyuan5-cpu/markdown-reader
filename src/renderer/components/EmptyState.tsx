import React, { useEffect, useState } from 'react'
import { Box, Typography, Button, Paper, Stack, Fade } from '@mui/material'
import { FolderOpen, CreateNewFolder, AutoStories } from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'

// 水墨波纹组件
function InkRipple({ delay = 0 }: { delay?: number }) {
  return (
    <Box
      className="ink-ripple"
      sx={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--ink-quaternary) 0%, transparent 70%)',
        opacity: 0,
        animation: `ink-spread 4s ease-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

// 装饰性墨迹组件
function InkDecoration({
  top,
  left,
  right,
  bottom,
  size = 100,
  rotate = 0,
  opacity = 0.1
}: {
  top?: string | number
  left?: string | number
  right?: string | number
  bottom?: string | number
  size?: number
  rotate?: number
  opacity?: number
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        opacity,
        transform: `rotate(${rotate}deg)`,
        pointerEvents: 'none',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, var(--ink-tertiary) 0%, transparent 60%)`,
          borderRadius: '60% 40% 50% 50% / 50% 50% 40% 60%',
          filter: 'blur(20px)',
        },
      }}
    />
  )
}

export default function EmptyState() {
  const { openFileDialog, openFolderDialog } = useAppContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Box
      className="paper-texture"
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'var(--paper-bg)',
      }}
    >
      {/* 背景装饰墨迹 */}
      <InkDecoration top="10%" left="5%" size={300} rotate={45} opacity={0.06} />
      <InkDecoration top="60%" right="10%" size={250} rotate={-30} opacity={0.05} />
      <InkDecoration bottom="10%" left="20%" size={180} rotate={60} opacity={0.04} />

      {/* 中央内容 */}
      <Fade in={mounted} timeout={800}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6, md: 8 },
            textAlign: 'center',
            maxWidth: 520,
            width: '100%',
            bgcolor: 'var(--paper-elevated)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--paper-border)',
            boxShadow: '0 8px 32px var(--shadow-color)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 内部装饰 */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
              opacity: 0.1,
              filter: 'blur(30px)',
            }}
          />

          {/* Logo/Icon */}
          <Box
            sx={{
              mb: 3,
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InkRipple delay={0} />
            <InkRipple delay={1.3} />
            <InkRipple delay={2.6} />

            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-xl)',
                bgcolor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
                boxShadow: '0 8px 24px rgba(199, 62, 58, 0.3)',
              }}
            >
              <AutoStories sx={{ fontSize: 40, color: '#fff' }} />
            </Box>
          </Box>

          {/* 标题 */}
          <Typography
            variant="h3"
            sx={{
              mb: 1.5,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--ink-primary)',
              letterSpacing: '0.1em',
            }}
          >
            FlowMark
          </Typography>

          {/* 副标题 */}
          <Typography
            variant="subtitle1"
            sx={{
              mb: 4,
              color: 'var(--ink-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
            }}
          >
            沉浸式 Markdown 阅读与知识管理
          </Typography>

          {/* 按钮组 */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 4 }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<FolderOpen />}
              onClick={openFileDialog}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 500,
                bgcolor: 'var(--accent-primary)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(199, 62, 58, 0.35)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'var(--accent-primary-hover)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(199, 62, 58, 0.45)',
                },
              }}
            >
              打开文件
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<CreateNewFolder />}
              onClick={openFolderDialog}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 500,
                borderColor: 'var(--paper-border)',
                color: 'var(--ink-secondary)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: 'var(--ink-tertiary)',
                  bgcolor: 'var(--hover-bg)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              打开文件夹
            </Button>
          </Stack>

          {/* 分隔线 */}
          <Box
            sx={{
              width: 60,
              height: 2,
              bgcolor: 'var(--paper-border)',
              mx: 'auto',
              mb: 3,
              borderRadius: 1,
            }}
          />

          {/* 快捷键提示 */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1.5,
                color: 'var(--ink-tertiary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
              }}
            >
              快捷操作
            </Typography>
            <Stack
              direction="row"
              spacing={3}
              justifyContent="center"
              flexWrap="wrap"
              gap={1}
            >
              {[
                { key: 'Ctrl + O', desc: '打开文件' },
                { key: 'F11', desc: '专注模式' },
                { key: 'Ctrl + 滚轮', desc: '缩放' },
              ].map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    component="kbd"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      bgcolor: 'var(--paper-surface)',
                      border: '1px solid var(--paper-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--ink-secondary)',
                      boxShadow: '0 1px 2px var(--shadow-color)',
                    }}
                  >
                    {item.key}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'var(--ink-tertiary)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {item.desc}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* 底部标语 */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 4,
              pt: 3,
              borderTop: '1px solid var(--paper-border)',
              color: 'var(--ink-quaternary)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              letterSpacing: '0.05em',
            }}
          >
            " Reading should flow like water "
          </Typography>
        </Paper>
      </Fade>
    </Box>
  )
}
