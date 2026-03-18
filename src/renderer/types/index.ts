export interface FileData {
  path: string
  name: string
  content: string
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface OutlineItem {
  level: number
  text: string
  id: string
}

export interface Bookmark {
  id: string
  text: string
  note?: string
  position: number
  createdAt: Date
}

export interface Highlight {
  id: string
  text: string
  color: string
  position: number
}

export type ViewMode = 'dual' | 'card' | 'focus'
export type ThemeType = 'light' | 'dark' | 'sepia' | 'midnight'

export interface AppState {
  currentFile: FileData | null
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
}

export interface SearchResult {
  index: number
  text: string
  context: string
}

export interface ParsedMarkdown {
  frontMatter: Record<string, any>
  content: string
  title?: string
  author?: string
  date?: string
  tags?: string[]
}
