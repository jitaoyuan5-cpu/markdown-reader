import * as fs from 'fs'
import * as path from 'path'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  content?: string
}

export class FileManager {
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`)
    }
  }

  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to save file: ${error}`)
    }
  }

  async readDirectory(dirPath: string): Promise<FileNode[]> {
    const buildTree = async (currentPath: string): Promise<FileNode[]> => {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
      const nodes: FileNode[] = []

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          const children = await buildTree(fullPath)
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children,
          })
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          })
        }
      }

      return nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name)
        }
        return a.type === 'directory' ? -1 : 1
      })
    }

    return buildTree(dirPath)
  }

  private isMarkdownFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ['.md', '.markdown', '.mdown', '.mkd'].includes(ext)
  }

  async getFileStats(filePath: string): Promise<{
    size: number
    created: Date
    modified: Date
  }> {
    const stats = await fs.promises.stat(filePath)
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    }
  }
}
