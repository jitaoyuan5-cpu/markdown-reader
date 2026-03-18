function validateJwtConfig(jwtConfig) {
  const errors = []
  if (!jwtConfig?.accessSecret || String(jwtConfig.accessSecret).length < 32) {
    errors.push('JWT_ACCESS_SECRET 必须配置且长度至少 32')
  }
  if (!jwtConfig?.refreshSecret || String(jwtConfig.refreshSecret).length < 32) {
    errors.push('JWT_REFRESH_SECRET 必须配置且长度至少 32')
  }
  return errors
}

module.exports = {
  validateJwtConfig,
}
