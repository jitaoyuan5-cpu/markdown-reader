const { spawn } = require('node:child_process')
const path = require('node:path')

function normalizeWindowsExtendedPath(inputPath) {
  if (process.platform === 'win32' && inputPath.startsWith('\\\\?\\')) {
    return inputPath.slice(4)
  }
  return inputPath
}

const projectRoot = normalizeWindowsExtendedPath(
  process.env.INIT_CWD || path.resolve(__dirname, '..'),
)
process.chdir(projectRoot)

const electronBinary = require('electron')
const child = spawn(electronBinary, [projectRoot], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false,
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error('Failed to launch Electron:', error)
  process.exit(1)
})
