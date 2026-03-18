import React, { useEffect } from 'react'
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Fade,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  Article,
  Folder,
  Bookmark as BookmarkIcon,
  AutoStories,
  DeleteOutline,
} from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'
import { OutlineItem, Bookmark } from '../types'

interface OutlineTreeProps {
  items: OutlineItem[]
  level?: number
  onItemClick: (id: string) => void
}

function OutlineTree({ items, level = 0, onItemClick }: OutlineTreeProps) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getIndent = (itemLevel: number) => itemLevel * 12

  return (
    <>
      {items.map((item, index) => {
        const hasChildren = items.some(
          (other, otherIndex) =>
            otherIndex > index && other.level > item.level
        )
        const isExpanded = expanded[item.id]

        return (
          <Box key={`${item.id}-${index}`}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => onItemClick(item.id)}
                sx={{
                  pl: 1 + getIndent(item.level) / 8,
                  py: 0.5,
                  minHeight: 32,
                }}
              >
                {hasChildren && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(item.id)
                    }}
                    sx={{ mr: 0.5, p: 0.2 }}
                  >
                    {isExpanded ? (
                      <ExpandLess fontSize="small" />
                    ) : (
                      <ExpandMore fontSize="small" />
                    )}
                  </IconButton>
                )}
                {!hasChildren && <Box sx={{ width: 20, mr: 0.5 }} />}
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontSize: 13 - item.level,
                    fontWeight: item.level <= 1 ? 500 : 400,
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        )
      })}
    </>
  )
}

interface BookmarkItemProps {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onClick: (bookmark: Bookmark) => void
}

function BookmarkItem({ bookmark, onDelete, onClick }: BookmarkItemProps) {
  return (
    <ListItem
      disablePadding
      secondaryAction={
        <IconButton
          edge="end"
          size="small"
          onClick={() => onDelete(bookmark.id)}
          sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      }
      sx={{
        '&:hover .MuiIconButton-root': { opacity: 1 },
      }}
    >
      <ListItemButton onClick={() => onClick(bookmark)} sx={{ py: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 28 }}>
          <BookmarkIcon fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText
          primary={bookmark.text.slice(0, 50) + '...'}
          secondary={bookmark.note}
          primaryTypographyProps={{
            variant: 'body2',
            noWrap: true,
            fontSize: 12,
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true,
            fontSize: 10,
          }}
        />
      </ListItemButton>
    </ListItem>
  )
}

export default function Sidebar() {
  const {
    currentFile,
    outline,
    bookmarks,
    setBookmarks,
    recentFiles,
    openRecentFile,
    removeRecentFile,
  } = useAppContext()

  const [activeTab, setActiveTab] = React.useState<'outline' | 'bookmarks' | 'files'>('outline')
  const [filesExpanded, setFilesExpanded] = React.useState(true)

  const handleOutlineClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleBookmarkClick = (bookmark: Bookmark) => {
    const scrollContainer = document.getElementById('markdown-scroll-container')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: bookmark.position, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: bookmark.position, behavior: 'smooth' })
  }

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id))
  }

  const handleOpenRecentFile = async (filePath: string) => {
    try {
      await openRecentFile(filePath)
    } catch (error) {
      console.error(`Failed to open recent file: ${filePath}`, error)
      await removeRecentFile(filePath)
      alert(`文件不存在或无法访问，已从最近文件移除：${filePath}`)
    }
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
        <IconButton
          size="small"
          onClick={() => setActiveTab('outline')}
          sx={{
            flex: 1,
            borderRadius: 0,
            bgcolor: activeTab === 'outline' ? 'action.selected' : 'transparent',
          }}
        >
          <AutoStories fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setActiveTab('bookmarks')}
          sx={{
            flex: 1,
            borderRadius: 0,
            bgcolor: activeTab === 'bookmarks' ? 'action.selected' : 'transparent',
          }}
        >
          <BookmarkIcon fontSize="small" />
          {bookmarks.length > 0 && (
            <Chip
              size="small"
              label={bookmarks.length}
              sx={{ ml: 0.5, height: 16, fontSize: 10 }}
            />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setActiveTab('files')}
          sx={{
            flex: 1,
            borderRadius: 0,
            bgcolor: activeTab === 'files' ? 'action.selected' : 'transparent',
          }}
        >
          <Folder fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ overflow: 'auto', flex: 1, p: 1 }}>
        {activeTab === 'outline' && (
          <>
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              文章大纲
            </Typography>
            {outline.length > 0 ? (
              <List dense disablePadding>
                <OutlineTree items={outline} onItemClick={handleOutlineClick} />
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, py: 2, textAlign: 'center' }}
              >
                {currentFile ? '暂无大纲' : '打开文件查看大纲'}
              </Typography>
            )}
          </>
        )}

        {activeTab === 'bookmarks' && (
          <>
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              书签标注
            </Typography>
            {bookmarks.length > 0 ? (
              <List dense disablePadding>
                {bookmarks.map((bookmark) => (
                  <BookmarkItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onDelete={handleDeleteBookmark}
                    onClick={handleBookmarkClick}
                  />
                ))}
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, py: 2, textAlign: 'center' }}
              >
                暂无书签
                <br />
                选中文字添加标注
              </Typography>
            )}
          </>
        )}

        {activeTab === 'files' && (
          <>
            <ListItemButton
              onClick={() => setFilesExpanded(!filesExpanded)}
              sx={{ px: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Article fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="最近文件"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              />
              {filesExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={filesExpanded} timeout="auto" unmountOnExit>
              <List dense disablePadding>
                {recentFiles.length > 0 ? (
                  recentFiles.map((filePath) => (
                    <ListItem key={filePath} disablePadding>
                      <ListItemButton
                        onClick={() => handleOpenRecentFile(filePath)}
                        sx={{ pl: 3 }}
                      >
                        <ListItemText
                          primary={filePath.split(/[\\/]/).pop()}
                          secondary={filePath}
                          primaryTypographyProps={{
                            variant: 'body2',
                            noWrap: true,
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            noWrap: true,
                            fontSize: 10,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ px: 3, py: 1 }}
                  >
                    无最近文件
                  </Typography>
                )}
              </List>
            </Collapse>
          </>
        )}
      </Box>
    </Drawer>
  )
}
