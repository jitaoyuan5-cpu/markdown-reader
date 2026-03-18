const config = require('./config')
const { validateJwtConfig } = require('./utils/startup')
const { createApp } = require('./app')

const app = createApp()

try {
  const errors = validateJwtConfig(config.jwt)
  if (errors.length > 0) {
    throw new Error(errors.join('；'))
  }
  app.listen(config.port, () => {
    console.log(`[flowmark-server] listening on ${config.port}`)
  })
} catch (error) {
  console.error(`[flowmark-server] startup failed: ${error?.message || error}`)
  process.exit(1)
}
