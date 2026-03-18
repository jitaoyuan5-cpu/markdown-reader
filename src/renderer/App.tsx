import React, { useEffect } from 'react'
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import { AppProvider, useAppContext } from './context/AppContext'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MarkdownViewer from './components/MarkdownViewer'
import EmptyState from './components/EmptyState'
import FocusMode from './components/FocusMode'
import CardMode from './components/CardMode'
import LoginPage from './components/LoginPage'
import { ViewMode, ThemeType } from './types'
import './styles/themes/fluid-ink.css'

// 创建 MUI 主题 - 与 CSS 变量同步
const createAppTheme = (themeType: ThemeType) => {
  // 获取 CSS 变量值
  const getCssVar = (name: string) => {
    if (typeof document === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  const isDark = themeType === 'dark' || themeType === 'midnight'

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#E07A78' : '#C73E3A',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#7AB8E8' : '#2E5C8A',
      },
      background: {
        default: isDark ? '#0D1117' : '#FAF8F3',
        paper: isDark ? '#161B22' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#E8E4DF' : '#2C2C2C',
        secondary: isDark ? '#B8B4AF' : '#5C5C5C',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    typography: {
      fontFamily: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
      h1: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
      h2: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
      h3: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
      h4: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
      h5: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
      h6: { fontFamily: '"LXGW WenKai", "STKaiti", serif' },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}

function AppContent() {
  const { authStatus } = useAuthContext()
  const {
    currentFile,
    viewMode,
    themeType,
    focusMode,
    sidebarOpen,
    zoom,
    setThemeType,
    setViewMode,
    setFocusMode,
    setSidebarOpen,
    setZoom,
    openFile,
    loadRemoteUserData,
    resetUserData,
    syncNotice,
    clearSyncNotice,
  } = useAppContext()

  const theme = createAppTheme(themeType)

  // 应用 CSS 主题变量
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeType)
  }, [themeType])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadRemoteUserData().catch((error) => {
        console.warn('Failed to load remote user data:', error)
      })
      return
    }

    if (authStatus === 'unauthenticated') {
      resetUserData()
    }
  }, [authStatus, loadRemoteUserData, resetUserData])

  // 监听主进程事件
  useEffect(() => {
    window.electron?.onFileOpened((data) => {
      openFile(data)
    })

    window.electron?.onFolderOpened((files) => {
      console.log('Folder opened:', files)
    })

    window.electron?.onFocusMode(() => {
      setFocusMode((prev) => !prev)
    })

    window.electron?.onSetViewMode((mode) => {
      setViewMode(mode as ViewMode)
    })

    window.electron?.onSetTheme((theme) => {
      setThemeType(theme as ThemeType)
    })

    window.electron?.onZoomIn(() => {
      setZoom((prev) => Math.min(prev + 0.1, 2))
    })

    window.electron?.onZoomOut(() => {
      setZoom((prev) => Math.max(prev - 0.1, 0.5))
    })

    window.electron?.onZoomReset(() => {
      setZoom(1)
    })

    return () => {
      window.electron?.removeAllListeners('file:opened')
      window.electron?.removeAllListeners('folder:opened')
      window.electron?.removeAllListeners('view:focusMode')
      window.electron?.removeAllListeners('view:setMode')
      window.electron?.removeAllListeners('theme:set')
      window.electron?.removeAllListeners('zoom:in')
      window.electron?.removeAllListeners('zoom:out')
      window.electron?.removeAllListeners('zoom:reset')
    }
  }, [])

  // 处理文件拖拽
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer?.files || []).map((f) =>
        (f as any).path,
      )
      if (files.length > 0 && window.electron) {
        window.electron.handleDroppedFiles(files)
      }
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  if (authStatus === 'checking') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      </ThemeProvider>
    )
  }

  if (authStatus === 'unauthenticated') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage />
      </ThemeProvider>
    )
  }

  if (focusMode && currentFile) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FocusMode onExit={() => setFocusMode(false)} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Header />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {sidebarOpen && viewMode === 'dual' && <Sidebar />}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: 'background.default',
            }}
          >
            {currentFile ? (
              viewMode === 'card' ? (
                <CardMode />
              ) : (
                <MarkdownViewer />
              )
            ) : (
              <EmptyState />
            )}
          </Box>
        </Box>
        <Snackbar
          open={Boolean(syncNotice)}
          autoHideDuration={4000}
          onClose={clearSyncNotice}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={clearSyncNotice} severity="warning" variant="filled" sx={{ width: '100%' }}>
            {syncNotice}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}

export default App
