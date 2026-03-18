import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from '@mui/material'
import {
  Menu as MenuIcon,
  FolderOpen,
  Brightness4,
  Brightness7,
  LocalCafe,
  NightsStay,
  Fullscreen,
  Search,
  ZoomIn,
  ZoomOut,
  ViewSidebar,
  Dashboard,
  Close,
  Logout,
  FileDownload,
  PictureAsPdf,
  Html,
} from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'
import { ThemeType, ViewMode } from '../types'
import { useAuthContext } from '../context/AuthContext'
import { exportCurrentFileAsHtml, exportCurrentFileAsPdf } from '../utils/exportActions'

export default function Header() {
  const { user, logout } = useAuthContext()
  const {
    currentFile,
    openFiles,
    themeType,
    viewMode,
    sidebarOpen,
    setThemeType,
    setViewMode,
    setSidebarOpen,
    openFileDialog,
    openFolderDialog,
    switchToFile,
    closeFile,
    setFocusMode,
    zoom,
    setZoom,
    searchQuery,
    setSearchQuery,
  } = useAppContext()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleThemeChange = (theme: ThemeType) => {
    setThemeType(theme)
    handleMenuClose()
  }

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportAnchorEl(null)
  }

  const handleExportPdf = async () => {
    handleExportMenuClose()
    const result = await exportCurrentFileAsPdf({ file: currentFile, themeType })
    if (!result.ok && result.message !== '已取消导出') {
      alert(result.message)
    }
  }

  const handleExportHtml = async () => {
    handleExportMenuClose()
    const result = await exportCurrentFileAsHtml({ file: currentFile, themeType })
    if (!result.ok && result.message !== '已取消导出') {
      alert(result.message)
    }
  }

  const getThemeIcon = () => {
    switch (themeType) {
      case 'dark':
        return <Brightness4 />
      case 'sepia':
        return <LocalCafe />
      case 'midnight':
        return <NightsStay />
      default:
        return <Brightness7 />
    }
  }

  const getThemeLabel = () => {
    switch (themeType) {
      case 'light':
        return '浅色'
      case 'dark':
        return '深色'
      case 'sepia':
        return '护眼模式'
      case 'midnight':
        return 'OLED 纯黑'
      default:
        return '主题'
    }
  }

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{ flexGrow: 0, mr: 2, fontWeight: 600, color: 'text.primary' }}
          >
            FlowMark
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={<FolderOpen />}
              onClick={openFileDialog}
              sx={{ textTransform: 'none' }}
            >
              打开文件
            </Button>
            <Button
              size="small"
              onClick={openFolderDialog}
              sx={{ textTransform: 'none' }}
            >
              打开文件夹
            </Button>
            <Button
              size="small"
              startIcon={<FileDownload />}
              onClick={handleExportMenuOpen}
              sx={{ textTransform: 'none' }}
              disabled={!currentFile}
            >
              导出
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={handleExportPdf}>
                <PictureAsPdf fontSize="small" style={{ marginRight: 8 }} />
                导出为 PDF
              </MenuItem>
              <MenuItem onClick={handleExportHtml}>
                <Html fontSize="small" style={{ marginRight: 8 }} />
                导出为 HTML
              </MenuItem>
            </Menu>

            {currentFile && (
              <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }} noWrap>
                {currentFile.name}
              </Typography>
            )}
            {user && (
              <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }} noWrap>
                当前用户：{user.account}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="搜索">
              <IconButton size="small" onClick={() => setSearchOpen(true)}>
                <Search fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="缩小">
              <IconButton size="small" onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}>
                <ZoomOut fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="放大">
              <IconButton size="small" onClick={() => setZoom(Math.min(zoom + 0.1, 2))}>
                <ZoomIn fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={viewMode === 'dual' ? '切换到卡片模式' : '切换到双栏模式'}>
              <IconButton
                size="small"
                onClick={() => setViewMode(viewMode === 'dual' ? 'card' : 'dual')}
              >
                {viewMode === 'dual' ? <Dashboard fontSize="small" /> : <ViewSidebar fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="专注模式">
              <IconButton size="small" onClick={() => setFocusMode(true)}>
                <Fullscreen fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={getThemeLabel()}>
              <IconButton size="small" onClick={handleMenuOpen}>
                {getThemeIcon()}
              </IconButton>
            </Tooltip>
            <Tooltip title="退出登录">
              <IconButton size="small" onClick={() => logout()}>
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleThemeChange('light')}>浅色</MenuItem>
              <MenuItem onClick={() => handleThemeChange('dark')}>深色</MenuItem>
              <MenuItem onClick={() => handleThemeChange('sepia')}>护眼模式</MenuItem>
              <MenuItem onClick={() => handleThemeChange('midnight')}>OLED 纯黑</MenuItem>
            </Menu>
          </Box>
        </Toolbar>

        {openFiles.length > 0 && (
          <Box sx={{ borderTop: 1, borderColor: 'divider', px: 1, bgcolor: 'background.paper' }}>
            <Tabs
              value={currentFile?.path ?? false}
              onChange={(_, value) => switchToFile(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  minHeight: 40,
                  textTransform: 'none',
                  minWidth: 120,
                  maxWidth: 220,
                },
              }}
            >
              {openFiles.map((file) => (
                <Tab
                  key={file.path}
                  value={file.path}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 140 }}>
                        {file.name}
                      </Typography>
                      <Box
                        component="span"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation()
                          closeFile(file.path)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            closeFile(file.path)
                          }
                        }}
                        sx={{
                          p: 0.2,
                          lineHeight: 0,
                          display: 'inline-flex',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </Box>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}
      </AppBar>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>全文搜索</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="输入搜索关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setSearchOpen(false)}>搜索</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
