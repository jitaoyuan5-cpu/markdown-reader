import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 文件操作
  openFile: (filePath: string) => ipcRenderer.invoke('file:open', filePath),
  openDirectory: (dirPath: string) => ipcRenderer.invoke('file:openDirectory', dirPath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', filePath, content),

  // 对话框
  showOpenDialog: () => ipcRenderer.invoke('dialog:openFile'),
  showOpenFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  exportPdf: (payload: { html: string; suggestedFileName: string }) =>
    ipcRenderer.invoke('export:pdf:save', payload),

  // 存储
  storeGet: (key: string, defaultValue?: any) => ipcRenderer.invoke('store:get', key, defaultValue),
  storeSet: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
  getRecentFiles: () => ipcRenderer.invoke('store:getRecentFiles'),
  addRecentFile: (filePath: string) => ipcRenderer.invoke('store:addRecentFile', filePath),
  removeRecentFile: (filePath: string) =>
    ipcRenderer.invoke('store:removeRecentFile', filePath),

  // 文件拖拽
  handleDroppedFiles: (files: string[]) => ipcRenderer.send('files:dropped', files),

  // 鉴权
  auth: {
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    getCaptcha: () => ipcRenderer.invoke('auth:getCaptcha'),
    login: (payload: {
      account: string
      password: string
      captchaId: string
      captchaText: string
    }) => ipcRenderer.invoke('auth:login', payload),
    register: (payload: {
      account: string
      password: string
      captchaId: string
      captchaText: string
    }) => ipcRenderer.invoke('auth:register', payload),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  // 云端同步
  sync: {
    files: {
      list: () => ipcRenderer.invoke('sync:files:list'),
      upsert: (payload: { fileKey: string; fileName: string; content: string }) =>
        ipcRenderer.invoke('sync:files:upsert', payload),
    },
    bookmarks: {
      list: () => ipcRenderer.invoke('sync:bookmarks:list'),
      upsert: (payload: {
        bookmarkId: string
        fileKey: string
        text: string
        note?: string
        position: number
      }) => ipcRenderer.invoke('sync:bookmarks:upsert', payload),
      delete: (bookmarkId: string) => ipcRenderer.invoke('sync:bookmarks:delete', bookmarkId),
    },
  },

  // 监听主进程事件
  onFileOpened: (callback: (data: any) => void) => {
    ipcRenderer.on('file:opened', (_, data) => callback(data))
  },
  onFolderOpened: (callback: (files: any[]) => void) => {
    ipcRenderer.on('folder:opened', (_, files) => callback(files))
  },
  onFocusMode: (callback: () => void) => {
    ipcRenderer.on('view:focusMode', () => callback())
  },
  onSetViewMode: (callback: (mode: string) => void) => {
    ipcRenderer.on('view:setMode', (_, mode) => callback(mode))
  },
  onSetTheme: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:set', (_, theme) => callback(theme))
  },
  onZoomIn: (callback: () => void) => {
    ipcRenderer.on('zoom:in', () => callback())
  },
  onZoomOut: (callback: () => void) => {
    ipcRenderer.on('zoom:out', () => callback())
  },
  onZoomReset: (callback: () => void) => {
    ipcRenderer.on('zoom:reset', () => callback())
  },
  onExportPDF: (callback: () => void) => {
    ipcRenderer.on('export:pdf', () => callback())
  },
  onExportHTML: (callback: () => void) => {
    ipcRenderer.on('export:html', () => callback())
  },
  onAuthExpired: (callback: () => void) => {
    ipcRenderer.on('auth:expired', () => callback())
  },

  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
