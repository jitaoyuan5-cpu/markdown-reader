export interface IElectronAPI {
  // 文件操作
  openFile: (filePath: string) => Promise<string>
  openDirectory: (dirPath: string) => Promise<any[]>
  saveFile: (filePath: string, content: string) => Promise<void>

  // 对话框
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  showOpenFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>

  // 存储
  storeGet: (key: string, defaultValue?: any) => Promise<any>
  storeSet: (key: string, value: any) => Promise<void>
  getRecentFiles: () => Promise<string[]>
  addRecentFile: (filePath: string) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>

  // 文件拖拽
  handleDroppedFiles: (files: string[]) => void

  // 鉴权
  auth: {
    getSession: () => Promise<{ user: { id: number; account: string; status: string } } | null>
    getCaptcha: () => Promise<{ captchaId: string; imageBase64: string; expireAt: string }>
    login: (payload: {
      account: string
      password: string
      captchaId: string
      captchaText: string
    }) => Promise<{ user: { id: number; account: string; status: string } }>
    register: (payload: {
      account: string
      password: string
      captchaId: string
      captchaText: string
    }) => Promise<{ user: { id: number; account: string; status: string }; message: string }>
    logout: () => Promise<void>
  }

  // 云端同步
  sync: {
    files: {
      list: () => Promise<{
        items: Array<{
          fileKey: string
          fileName: string
          content: string
          updatedAt: string
        }>
      }>
      upsert: (payload: { fileKey: string; fileName: string; content: string }) => Promise<any>
    }
    bookmarks: {
      list: () => Promise<{
        items: Array<{
          bookmarkId: string
          fileKey: string
          text: string
          note?: string
          position: number
          createdAt: string
          updatedAt: string
        }>
      }>
      upsert: (payload: {
        bookmarkId: string
        fileKey: string
        text: string
        note?: string
        position: number
      }) => Promise<any>
      delete: (bookmarkId: string) => Promise<any>
    }
  }

  // 事件监听
  onFileOpened: (callback: (data: any) => void) => void
  onFolderOpened: (callback: (files: any[]) => void) => void
  onFocusMode: (callback: () => void) => void
  onSetViewMode: (callback: (mode: string) => void) => void
  onSetTheme: (callback: (theme: string) => void) => void
  onZoomIn: (callback: () => void) => void
  onZoomOut: (callback: () => void) => void
  onZoomReset: (callback: () => void) => void
  onExportPDF: (callback: () => void) => void
  onExportHTML: (callback: () => void) => void
  onAuthExpired: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electron?: IElectronAPI
  }
}
