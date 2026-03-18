const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const fileRoutes = require('./routes/files')
const bookmarkRoutes = require('./routes/bookmarks')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/healthz', (_, res) => {
    res.json({ ok: true, service: 'flowmark-server' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/files', fileRoutes)
  app.use('/api/bookmarks', bookmarkRoutes)

  app.use((err, _req, res, _next) => {
    console.error('[server-error]', err)
    res.status(500).json({ message: '服务器内部错误' })
  })

  return app
}

module.exports = {
  createApp,
}
