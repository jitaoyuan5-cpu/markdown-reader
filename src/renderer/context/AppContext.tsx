import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  Dispatch,
  SetStateAction,
} from 'react'
import { FileData, ViewMode, ThemeType, OutlineItem, Bookmark, Highlight, SearchResult } from '../types'

interface AppContextType {
  currentFile: FileData | null
  openFiles: FileData[]
  recentFiles: string[]
  viewMode: ViewMode
  themeType: ThemeType
  focusMode: boolean
  sidebarOpen: boolean
  zoom: number
  outline: OutlineItem[]
  bookmarks: Bookmark[]
  highlights: Highlight[]
  searchQuery: string
  searchResults: SearchResult[]
  syncNotice: string
  setCurrentFile: (file: FileData | null) => void
  setRecentFiles: (files: string[]) => void
  setViewMode: (mode: ViewMode) => void
  setThemeType: (theme: ThemeType) => void
  setFocusMode: (focus: boolean | ((prev: boolean) => boolean)) => void
  setSidebarOpen: (open: boolean) => void
  setZoom: (zoom: number | ((prev: number) => number)) => void
  setOutline: (outline: OutlineItem[]) => void
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>
  setHighlights: Dispatch<SetStateAction<Highlight[]>>
  setSearchQuery: (query: string) => void
  setSearchResults: (results: SearchResult[]) => void
  clearSyncNotice: () => void
  openFile: (file: FileData) => Promise<void>
  openRecentFile: (filePath: string) => Promise<void>
  switchToFile: (filePath: string) => void
  closeFile: (filePath: string) => void
  removeRecentFile: (filePath: string) => Promise<void>
  loadRemoteUserData: () => Promise<void>
  resetUserData: () => void
  openFileDialog: () => Promise<void>
  openFolderDialog: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// 全局暴露的 context 控制器（用于测试）
declare global {
  interface Window {
    __appController?: {
      loadFile: (file: FileData) => void
      setViewMode: (mode: ViewMode) => void
      setThemeType: (theme: ThemeType) => void
      setZoom: (zoom: number) => void
      toggleFocusMode: () => void
    }
  }
}

// 读取文件内容为文本
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}

// localStorage key for recent files
const RECENT_FILES_KEY = 'flowmark_recent_files'
const EMPTY_BOOKMARKS: Bookmark[] = []
const EMPTY_HIGHLIGHTS: Highlight[] = []

// 从 localStorage 加载最近文件
const loadRecentFilesFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// 保存最近文件到 localStorage
const saveRecentFilesToStorage = (files: string[]) => {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files.slice(0, 20)))
  } catch (e) {
    console.error('Failed to save recent files:', e)
  }
}

const toCloudFileKey = (filePath: string): string => {
  if (filePath.startsWith('cloud://')) {
    return filePath.replace('cloud://', '')
  }
  return filePath
}

const toCloudPath = (fileKey: string): string => `cloud://${fileKey}`

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentFile, setCurrentFile] = useState<FileData | null>(null)
  const [openFiles, setOpenFiles] = useState<FileData[]>([])
  const [fileCache, setFileCache] = useState<Record<string, FileData>>({})
  const [recentFiles, setRecentFiles] = useState<string[]>(loadRecentFilesFromStorage)
  const [viewMode, setViewMode] = useState<ViewMode>('dual')
  const [themeType, setThemeType] = useState<ThemeType>('light')
  const [focusMode, setFocusMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [bookmarksByFile, setBookmarksByFile] = useState<Record<string, Bookmark[]>>({})
  const [highlightsByFile, setHighlightsByFile] = useState<Record<string, Highlight[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [syncNotice, setSyncNotice] = useState('')
  const bookmarks = currentFile
    ? (bookmarksByFile[currentFile.path] ?? EMPTY_BOOKMARKS)
    : EMPTY_BOOKMARKS
  const highlights = currentFile
    ? (highlightsByFile[currentFile.path] ?? EMPTY_HIGHLIGHTS)
    : EMPTY_HIGHLIGHTS

  const hasCloudSession = useCallback(async () => {
    if (!window.electron) {
      return false
    }
    const session = await window.electron.auth.getSession()
    return Boolean(session?.user)
  }, [])

  const syncFileToCloud = useCallback(
    async (file: FileData) => {
      if (!window.electron) {
        return
      }
      const hasSession = await hasCloudSession()
      if (!hasSession) {
        return
      }
      await window.electron.sync.files.upsert({
        fileKey: toCloudFileKey(file.path),
        fileName: file.name,
        content: file.content,
      })
    },
    [hasCloudSession],
  )

  const syncBookmarksDiff = useCallback(
    async (filePath: string, prevItems: Bookmark[], nextItems: Bookmark[]) => {
      if (!window.electron) {
        return
      }
      const hasSession = await hasCloudSession()
      if (!hasSession) {
        return
      }

      const prevMap = new Map(prevItems.map((item) => [item.id, item]))
      const nextMap = new Map(nextItems.map((item) => [item.id, item]))

      const removedIds = Array.from(prevMap.keys()).filter((id) => !nextMap.has(id))
      const upsertItems = Array.from(nextMap.values())

      for (const bookmark of upsertItems) {
        await window.electron.sync.bookmarks.upsert({
          bookmarkId: bookmark.id,
          fileKey: toCloudFileKey(filePath),
          text: bookmark.text,
          note: bookmark.note,
          position: bookmark.position,
        })
      }
      for (const bookmarkId of removedIds) {
        await window.electron.sync.bookmarks.delete(bookmarkId)
      }
    },
    [hasCloudSession],
  )

  // 当前文件关闭后，清理依赖文档内容的视图状态，避免显示残留数据
  useEffect(() => {
    if (!currentFile) {
      setOutline([])
      setSearchResults([])
      setSearchQuery('')
    }
  }, [currentFile])

  // 初始化最近文件（Electron 从主进程 store 读取，浏览器从 localStorage 读取）
  useEffect(() => {
    let mounted = true
    const loadRecentFiles = async () => {
      if (!mounted) return
      if (window.electron) {
        try {
          const recent = await window.electron.getRecentFiles()
          if (mounted) {
            setRecentFiles(recent)
          }
        } catch (error) {
          console.error('Failed to load recent files from electron store:', error)
        }
      } else {
        setRecentFiles(loadRecentFilesFromStorage())
      }
    }
    loadRecentFiles()
    return () => {
      mounted = false
    }
  }, [])

  // 打开文件、激活标签并记录到最近文件
  const openFile = useCallback(async (file: FileData) => {
    setFileCache((prev) => ({ ...prev, [file.path]: file }))
    setOpenFiles((prev) => {
      const exists = prev.some((f) => f.path === file.path)
      if (exists) {
        return prev.map((f) => (f.path === file.path ? file : f))
      }
      return [...prev, file]
    })
    setCurrentFile(file)

    if (window.electron) {
      await window.electron.addRecentFile(file.path)
      const nextRecent = await window.electron.getRecentFiles()
      setRecentFiles(nextRecent)
      try {
        await syncFileToCloud(file)
      } catch (error) {
        console.warn('Failed to sync file to cloud:', error)
        setSyncNotice('云端文件同步失败，已保留本地数据，可稍后重试')
      }
    } else {
      setRecentFiles((prev) => {
        const filtered = prev.filter((f) => f !== file.path)
        const newRecent = [file.path, ...filtered].slice(0, 20)
        saveRecentFilesToStorage(newRecent)
        return newRecent
      })
    }
  }, [syncFileToCloud])

  const openRecentFile = useCallback(
    async (filePath: string) => {
      const cached = fileCache[filePath] || openFiles.find((file) => file.path === filePath)
      if (cached) {
        await openFile(cached)
        return
      }

      if (window.electron) {
        if (filePath.startsWith('cloud://')) {
          const fileKey = toCloudFileKey(filePath)
          const cloudFiles = await window.electron.sync.files.list()
          const matched = cloudFiles.items.find((item) => item.fileKey === fileKey)
          if (!matched) {
            throw new Error('云端文件不存在')
          }
          await openFile({
            path: toCloudPath(matched.fileKey),
            name: matched.fileName,
            content: matched.content,
          })
          return
        }
        const content = await window.electron.openFile(filePath)
        const name = filePath.split(/[\\/]/).pop() || 'Untitled'
        await openFile({ path: filePath, name, content })
        return
      }

      throw new Error('Cannot open uncached local file in browser mode')
    },
    [fileCache, openFiles, openFile],
  )

  const switchToFile = useCallback((filePath: string) => {
    setCurrentFile((prevCurrent) => {
      if (prevCurrent?.path === filePath) {
        return prevCurrent
      }
      const target = openFiles.find((file) => file.path === filePath)
      return target ?? prevCurrent
    })
  }, [openFiles])

  const closeFile = useCallback((filePath: string) => {
    setOpenFiles((prev) => {
      const closingIndex = prev.findIndex((file) => file.path === filePath)
      if (closingIndex === -1) {
        return prev
      }
      const nextFiles = prev.filter((file) => file.path !== filePath)

      setCurrentFile((current) => {
        if (current?.path !== filePath) {
          return current
        }
        if (nextFiles.length === 0) {
          return null
        }
        const fallbackIndex = Math.min(closingIndex, nextFiles.length - 1)
        return nextFiles[fallbackIndex]
      })

      return nextFiles
    })
  }, [])

  const removeRecentFile = useCallback(async (filePath: string) => {
    if (window.electron) {
      await window.electron.removeRecentFile(filePath)
      const nextRecent = await window.electron.getRecentFiles()
      setRecentFiles(nextRecent)
    } else {
      setRecentFiles((prev) => {
        const nextRecent = prev.filter((path) => path !== filePath)
        saveRecentFilesToStorage(nextRecent)
        return nextRecent
      })
    }
  }, [])

  const setBookmarks: Dispatch<SetStateAction<Bookmark[]>> = useCallback(
    (value) => {
      if (!currentFile) {
        return
      }

      setBookmarksByFile((prev) => {
        const current = prev[currentFile.path] ?? []
        const nextValue =
          typeof value === 'function'
            ? (value as (prevState: Bookmark[]) => Bookmark[])(current)
            : value

        void syncBookmarksDiff(currentFile.path, current, nextValue).catch((error) => {
          console.warn('Failed to sync bookmarks:', error)
          setSyncNotice('云端书签同步失败，已保留本地数据，可稍后重试')
        })
        return { ...prev, [currentFile.path]: nextValue }
      })
    },
    [currentFile, syncBookmarksDiff],
  )

  const setHighlights: Dispatch<SetStateAction<Highlight[]>> = useCallback(
    (value) => {
      if (!currentFile) {
        return
      }

      setHighlightsByFile((prev) => {
        const current = prev[currentFile.path] ?? []
        const nextValue =
          typeof value === 'function'
            ? (value as (prevState: Highlight[]) => Highlight[])(current)
            : value
        return { ...prev, [currentFile.path]: nextValue }
      })
    },
    [currentFile],
  )

  // 暴露控制器到 window 用于测试
  useEffect(() => {
    window.__appController = {
      loadFile: (file: FileData) => {
        openFile(file)
      },
      setViewMode: (mode: ViewMode) => setViewMode(mode),
      setThemeType: (theme: ThemeType) => setThemeType(theme),
      setZoom: (z: number) => setZoom(z),
      toggleFocusMode: () => setFocusMode((prev) => !prev),
    }
    return () => {
      delete window.__appController
    }
  }, [openFile])

  const openFileDialog = useCallback(async () => {
    try {
      if (window.electron) {
        // Electron 环境使用原生对话框
        const result = await window.electron.showOpenDialog()
        if (!result.canceled && result.filePaths.length > 0) {
          for (let i = 0; i < result.filePaths.length; i++) {
            const filePath = result.filePaths[i]
            const content = await window.electron.openFile(filePath)
            const name = filePath.split(/[\\/]/).pop() || 'Untitled'
            await openFile({ path: filePath, name, content })
          }
          if (result.filePaths.length > 1) {
            alert(`成功导入 ${result.filePaths.length} 个文件`)
          }
        }
      } else {
        // 浏览器环境使用隐藏的文件输入
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.markdown,.mdown,.mkd,.txt'
        input.multiple = true
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            let successCount = 0
            for (const file of Array.from(files)) {
              try {
                const content = await readFileAsText(file)
                await openFile({ path: file.name, name: file.name, content })
                successCount++
              } catch (err) {
                console.error('Failed to read file:', err)
                alert(`无法读取文件: ${file.name}`)
              }
            }
            if (successCount > 1) {
              alert(`成功导入 ${successCount} 个文件`)
            }
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
      alert('打开文件失败，请重试。')
    }
  }, [openFile])

  const openFolderDialog = useCallback(async () => {
    if (window.electron) {
      const result = await window.electron.showOpenFolderDialog()
      if (!result.canceled && result.filePaths.length > 0) {
        const files = await window.electron.openDirectory(result.filePaths[0])
        console.log('Folder files:', files)
      }
    } else {
      // 浏览器环境不支持文件夹选择，提示用户
      alert('在浏览器环境中暂不支持打开文件夹功能，请使用 Electron 版本。')
    }
  }, [])

  const loadRemoteUserData = useCallback(async () => {
    if (!window.electron) {
      return
    }
    const hasSession = await hasCloudSession()
    if (!hasSession) {
      return
    }

    const [fileResult, bookmarkResult] = await Promise.all([
      window.electron.sync.files.list(),
      window.electron.sync.bookmarks.list(),
    ])

    const files = (fileResult.items || []).map((item) => ({
      path: toCloudPath(item.fileKey),
      name: item.fileName,
      content: item.content,
    }))
    const fileMap: Record<string, FileData> = {}
    files.forEach((item) => {
      fileMap[item.path] = item
    })

    const bookmarksGrouped: Record<string, Bookmark[]> = {}
    for (const item of bookmarkResult.items || []) {
      const filePath = toCloudPath(item.fileKey)
      if (!bookmarksGrouped[filePath]) {
        bookmarksGrouped[filePath] = []
      }
      bookmarksGrouped[filePath].push({
        id: item.bookmarkId,
        text: item.text,
        note: item.note,
        position: item.position,
        createdAt: new Date(item.createdAt),
      })
    }

    setFileCache((prev) => ({ ...prev, ...fileMap }))
    setBookmarksByFile(bookmarksGrouped)

    if (files.length > 0) {
      setOpenFiles((prev) => {
        const existingPaths = new Set(prev.map((item) => item.path))
        const merged = [...prev]
        files.forEach((file) => {
          if (!existingPaths.has(file.path)) {
            merged.push(file)
          }
        })
        return merged
      })
      setCurrentFile((prev) => prev ?? files[0])
    }
  }, [hasCloudSession])

  const resetUserData = useCallback(() => {
    setCurrentFile(null)
    setOpenFiles([])
    setFileCache({})
    setBookmarksByFile({})
    setHighlightsByFile({})
    setOutline([])
    setSearchQuery('')
    setSearchResults([])
    setSyncNotice('')
  }, [])

  const clearSyncNotice = useCallback(() => {
    setSyncNotice('')
  }, [])

  return (
    <AppContext.Provider
      value={{
        currentFile,
        openFiles,
        recentFiles,
        viewMode,
        themeType,
        focusMode,
        sidebarOpen,
        zoom,
        outline,
        bookmarks,
        highlights,
        searchQuery,
        searchResults,
        syncNotice,
        setCurrentFile,
        setRecentFiles,
        setViewMode,
        setThemeType,
        setFocusMode,
        setSidebarOpen,
        setZoom,
        setOutline,
        setBookmarks,
        setHighlights,
        setSearchQuery,
        setSearchResults,
        clearSyncNotice,
        openFile,
        openRecentFile,
        switchToFile,
        closeFile,
        removeRecentFile,
        loadRemoteUserData,
        resetUserData,
        openFileDialog,
        openFolderDialog,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
