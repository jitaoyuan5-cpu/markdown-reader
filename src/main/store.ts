import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

export class Store {
  private configPath: string
  private data: Record<string, any>

  constructor() {
    const configDir = path.join(os.homedir(), '.flowmark-reader')
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    this.configPath = path.join(configDir, 'config.json')
    this.data = this.load()
  }

  private load(): Record<string, any> {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
    return {}
  }

  private save(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.data[key] !== undefined ? this.data[key] : defaultValue
  }

  set(key: string, value: any): void {
    this.data[key] = value
    this.save()
  }

  getRecentFiles(): string[] {
    return this.get('recentFiles', []) as string[]
  }

  addRecentFile(filePath: string): void {
    const recentFiles = this.getRecentFiles()
    const filtered = recentFiles.filter((f) => f !== filePath)
    filtered.unshift(filePath)
    this.set('recentFiles', filtered.slice(0, 20))
  }

  removeRecentFile(filePath: string): void {
    const recentFiles = this.getRecentFiles()
    const filtered = recentFiles.filter((f) => f !== filePath)
    this.set('recentFiles', filtered)
  }

  clearRecentFiles(): void {
    this.set('recentFiles', [])
  }
}
