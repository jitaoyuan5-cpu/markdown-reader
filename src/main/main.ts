import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { FileManager } from './fileManager'
import { Store } from './store'
import { BackendClient } from './backendClient'

const isDev = process.env.NODE_ENV === 'development'

class FlowMarkApp {
  private mainWindow: BrowserWindow | null = null
  private fileManager: FileManager
  private store: Store
  private backendClient: BackendClient

  constructor() {
    this.fileManager = new FileManager()
    this.store = new Store()
    this.backendClient = new BackendClient(this.store, () => {
      this.mainWindow?.webContents.send('auth:expired')
    })
    this.initializeApp()
  }

  private initializeApp(): void {
    // 处理 Windows 上第二个实例启动时的文件打开
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      app.quit()
      return
    }

    app.on('second-instance', (_, commandLine) => {
      // Windows: 从命令行参数获取文件路径
      const filePath = commandLine.find(arg =>
        arg.endsWith('.md') ||
        arg.endsWith('.markdown') ||
        arg.endsWith('.mdown')
      )

      if (filePath) {
        this.openFile(filePath)
      }

      // 聚焦到主窗口
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore()
        }
        this.mainWindow.focus()
      }
    })

    app.whenReady().then(() => {
      this.createWindow()
      this.setupMenu()
      this.setupIPC()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow()
        }
      })

      // 检查启动参数中是否有文件路径
      const filePath = process.argv.find(arg =>
        arg.endsWith('.md') ||
        arg.endsWith('.markdown') ||
        arg.endsWith('.mdown')
      )
      if (filePath) {
        setTimeout(() => this.openFile(filePath), 1000)
      }
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    // macOS: 处理文件拖拽打开
    app.on('open-file', (event, filePath) => {
      event.preventDefault()
      if (this.mainWindow) {
        this.openFile(filePath)
      } else {
        // 如果窗口还没准备好，延迟打开
        app.whenReady().then(() => {
          setTimeout(() => this.openFile(filePath), 1000)
        })
      }
    })
  }

  private createWindow(): void {
    const windowState = this.store.get('windowState', {
      width: 1400,
      height: 900,
      x: undefined,
      y: undefined,
      isMaximized: false,
    }) as {
      width: number
      height: number
      x: number | undefined
      y: number | undefined
      isMaximized: boolean
    }

    this.mainWindow = new BrowserWindow({
      width: windowState.width,
      height: windowState.height,
      x: windowState.x,
      y: windowState.y,
      minWidth: 800,
      minHeight: 600,
      title: 'FlowMark Reader',
      show: false,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    })

    // 加载页面
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
    }

    this.mainWindow.webContents.on(
      'did-fail-load',
      (_, errorCode, errorDescription, validatedURL) => {
        console.error(
          `Renderer failed to load: code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`,
        )
      },
    )

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      if (windowState.isMaximized) {
        this.mainWindow?.maximize()
      }
    })

    // 保存窗口状态
    this.mainWindow.on('close', () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.store.set('windowState', {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: this.mainWindow.isMaximized(),
        })
      }
    })

    // 处理拖拽事件
    this.mainWindow.webContents.on('dom-ready', () => {
      this.mainWindow?.webContents.executeJavaScript(`
        document.addEventListener('dragover', (e) => {
          e.preventDefault()
          e.stopPropagation()
        })
        document.addEventListener('drop', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const files = Array.from(e.dataTransfer.files).map(f => f.path)
          window.electron.handleDroppedFiles(files)
        })
      `)
    })
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '打开文件',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openFileDialog(),
          },
          {
            label: '打开文件夹',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.openFolderDialog(),
          },
          { type: 'separator' },
          {
            label: '最近打开的文件',
            submenu: this.buildRecentFilesMenu(),
          },
          { type: 'separator' },
          {
            label: '导出为 PDF',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => this.exportToPDF(),
          },
          {
            label: '导出为 HTML',
            accelerator: 'CmdOrCtrl+Shift+H',
            click: () => this.exportToHTML(),
          },
          { type: 'separator' },
          { role: 'quit', label: '退出' },
        ],
      },
      {
        label: '视图',
        submenu: [
          {
            label: '专注模式',
            accelerator: 'F11',
            click: () => this.toggleFocusMode(),
          },
          {
            label: '双栏模式',
            accelerator: 'CmdOrCtrl+1',
            click: () => this.setViewMode('dual'),
          },
          {
            label: '卡片模式',
            accelerator: 'CmdOrCtrl+2',
            click: () => this.setViewMode('card'),
          },
          { type: 'separator' },
          {
            label: '放大',
            accelerator: 'CmdOrCtrl+=',
            click: () => this.zoomIn(),
          },
          {
            label: '缩小',
            accelerator: 'CmdOrCtrl+-',
            click: () => this.zoomOut(),
          },
          {
            label: '重置缩放',
            accelerator: 'CmdOrCtrl+0',
            click: () => this.resetZoom(),
          },
        ],
      },
      {
        label: '主题',
        submenu: [
          {
            label: '浅色',
            click: () => this.setTheme('light'),
          },
          {
            label: '深色',
            click: () => this.setTheme('dark'),
          },
          {
            label: '护眼模式',
            click: () => this.setTheme('sepia'),
          },
          {
            label: 'OLED 纯黑',
            click: () => this.setTheme('midnight'),
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '快捷键',
            click: () => this.showShortcuts(),
          },
          {
            label: '关于',
            click: () => this.showAbout(),
          },
        ],
      },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private setupIPC(): void {
    // 文件操作
    ipcMain.handle('file:open', async (_, filePath: string) => {
      return this.fileManager.readFile(filePath)
    })

    ipcMain.handle('file:openDirectory', async (_, dirPath: string) => {
      return this.fileManager.readDirectory(dirPath)
    })

    ipcMain.handle('file:save', async (_, filePath: string, content: string) => {
      return this.fileManager.saveFile(filePath, content)
    })

    ipcMain.handle('store:get', (_, key: string, defaultValue?: any) => {
      return this.store.get(key, defaultValue)
    })

    ipcMain.handle('store:set', (_, key: string, value: any) => {
      this.store.set(key, value)
    })

    ipcMain.handle('store:getRecentFiles', () => {
      return this.store.getRecentFiles()
    })

    ipcMain.handle('store:addRecentFile', (_, filePath: string) => {
      this.store.addRecentFile(filePath)
    })

    ipcMain.handle('store:removeRecentFile', (_, filePath: string) => {
      this.store.removeRecentFile(filePath)
    })

    ipcMain.handle('auth:getSession', () => {
      const session = this.backendClient.getSession()
      if (!session) {
        return null
      }
      return {
        user: session.user,
      }
    })

    ipcMain.handle('auth:getCaptcha', async () => {
      return this.backendClient.getCaptcha()
    })

    ipcMain.handle(
      'auth:login',
      async (
        _,
        payload: {
          account: string
          password: string
          captchaId: string
          captchaText: string
        },
      ) => {
        const result = await this.backendClient.login(payload)
        return {
          user: result.user,
        }
      },
    )

    ipcMain.handle(
      'auth:register',
      async (
        _,
        payload: {
          account: string
          password: string
          captchaId: string
          captchaText: string
        },
      ) => {
        return this.backendClient.register(payload)
      },
    )

    ipcMain.handle('auth:logout', async () => {
      await this.backendClient.logout()
    })

    ipcMain.handle('sync:files:list', async () => {
      return this.backendClient.listFiles()
    })

    ipcMain.handle(
      'sync:files:upsert',
      async (_, payload: { fileKey: string; fileName: string; content: string }) => {
        return this.backendClient.upsertFile(payload)
      },
    )

    ipcMain.handle('sync:bookmarks:list', async () => {
      return this.backendClient.listBookmarks()
    })

    ipcMain.handle(
      'sync:bookmarks:upsert',
      async (
        _,
        payload: {
          bookmarkId: string
          fileKey: string
          text: string
          note?: string
          position: number
        },
      ) => {
        return this.backendClient.upsertBookmark(payload)
      },
    )

    ipcMain.handle('sync:bookmarks:delete', async (_, bookmarkId: string) => {
      return this.backendClient.deleteBookmark(bookmarkId)
    })

    ipcMain.handle('dialog:openFile', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile', 'multiSelections'],
        defaultPath: this.getSafeDialogDefaultPath(),
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      })
      this.rememberDialogPath(result.filePaths)
      return result
    })

    ipcMain.handle('dialog:openFolder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
        defaultPath: this.getSafeDialogDefaultPath(),
      })
      this.rememberDialogPath(result.filePaths)
      return result
    })

    ipcMain.handle('dialog:save', async (_, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options)
      return result
    })

    ipcMain.handle(
      'export:pdf:save',
      async (_, payload: { html: string; suggestedFileName: string }) => {
        const saveResult = await dialog.showSaveDialog(this.mainWindow!, {
          title: '导出为 PDF',
          defaultPath: payload.suggestedFileName,
          filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
        })

        if (saveResult.canceled || !saveResult.filePath) {
          return { canceled: true }
        }

        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        })

        try {
          await printWindow.loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`,
          )
          const pdfData = await printWindow.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
          })
          await fs.promises.writeFile(saveResult.filePath, pdfData)
          return { canceled: false, filePath: saveResult.filePath }
        } finally {
          if (!printWindow.isDestroyed()) {
            printWindow.destroy()
          }
        }
      },
    )

    // 处理拖拽文件
    ipcMain.on('files:dropped', (_, files: string[]) => {
      this.handleDroppedFiles(files)
    })
  }

  private async openFileDialog(): Promise<void> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      defaultPath: this.getSafeDialogDefaultPath(),
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (!result.canceled && result.filePaths.length > 0) {
      this.rememberDialogPath(result.filePaths)
      for (const filePath of result.filePaths) {
        await this.openFile(filePath)
      }
    }
  }

  private async openFolderDialog(): Promise<void> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openDirectory'],
      defaultPath: this.getSafeDialogDefaultPath(),
    })

    if (!result.canceled && result.filePaths.length > 0) {
      this.rememberDialogPath(result.filePaths)
      const files = await this.fileManager.readDirectory(result.filePaths[0])
      this.mainWindow?.webContents.send('folder:opened', files)
    }
  }

  private getSafeDialogDefaultPath(): string | undefined {
    const lastDir = this.store.get('lastDialogDir', '') as string
    if (lastDir && fs.existsSync(lastDir)) {
      return lastDir
    }

    const candidates: string[] = []
    const pushIfAvailable = (resolver: () => string) => {
      try {
        const value = resolver()
        if (value) {
          candidates.push(value)
        }
      } catch {
        // Ignore unavailable OS paths and continue fallback probing.
      }
    }
    pushIfAvailable(() => app.getPath('documents'))
    pushIfAvailable(() => app.getPath('home'))
    pushIfAvailable(() => process.cwd())
    pushIfAvailable(() => app.getPath('temp'))
    pushIfAvailable(() => app.getAppPath())
    pushIfAvailable(() => __dirname)
    pushIfAvailable(() => path.parse(process.execPath).root)

    for (const candidate of candidates) {
      if (!candidate) {
        continue
      }
      const normalized = path.resolve(candidate)
      if (fs.existsSync(normalized)) {
        return normalized
      }
    }
    return undefined
  }

  private rememberDialogPath(paths: string[]): void {
    if (!paths || paths.length === 0) {
      return
    }
    const selected = paths[0]
    const targetDir = fs.existsSync(selected) && fs.statSync(selected).isDirectory()
      ? selected
      : path.dirname(selected)
    if (targetDir && fs.existsSync(targetDir)) {
      this.store.set('lastDialogDir', targetDir)
    }
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const content = await this.fileManager.readFile(filePath)
      this.store.addRecentFile(filePath)
      this.mainWindow?.webContents.send('file:opened', {
        path: filePath,
        name: path.basename(filePath),
        content,
      })
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  private handleDroppedFiles(files: string[]): void {
    for (const filePath of files) {
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        this.fileManager.readDirectory(filePath).then((files) => {
          this.mainWindow?.webContents.send('folder:opened', files)
        })
      } else if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
        this.openFile(filePath)
      }
    }
  }

  private buildRecentFilesMenu(): Electron.MenuItemConstructorOptions[] {
    const recentFiles = this.store.getRecentFiles()
    if (recentFiles.length === 0) {
      return [{ label: '无最近文件', enabled: false }]
    }
    return recentFiles.map((file) => ({
      label: path.basename(file),
      click: () => this.openFile(file),
    }))
  }

  private toggleFocusMode(): void {
    this.mainWindow?.webContents.send('view:focusMode')
  }

  private setViewMode(mode: string): void {
    this.mainWindow?.webContents.send('view:setMode', mode)
  }

  private setTheme(theme: string): void {
    this.mainWindow?.webContents.send('theme:set', theme)
  }

  private zoomIn(): void {
    this.mainWindow?.webContents.send('zoom:in')
  }

  private zoomOut(): void {
    this.mainWindow?.webContents.send('zoom:out')
  }

  private resetZoom(): void {
    this.mainWindow?.webContents.send('zoom:reset')
  }

  private exportToPDF(): void {
    this.mainWindow?.webContents.send('export:pdf')
  }

  private exportToHTML(): void {
    this.mainWindow?.webContents.send('export:html')
  }

  private showShortcuts(): void {
    this.mainWindow?.webContents.send('help:shortcuts')
  }

  private showAbout(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: '关于 FlowMark Reader',
      message: 'FlowMark Reader',
      detail: '版本: 1.0.0\n沉浸式 Markdown 阅读与知识管理工具\n\nReading should flow like water',
      buttons: ['确定'],
    })
  }
}

new FlowMarkApp()
