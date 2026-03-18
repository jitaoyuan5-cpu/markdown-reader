const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const config = require('../config')

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      account: user.account,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  )
}

function signRefreshToken(user) {
  const tokenId = uuidv4()
  const refreshToken = jwt.sign(
    {
      sub: String(user.id),
      account: user.account,
      jti: tokenId,
    },
    config.jwt.refreshSecret,
    { expiresIn: `${config.jwt.refreshExpiresDays}d` },
  )
  return { refreshToken, tokenId }
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret)
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret)
}

function expiresAtFromNow(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

module.exports = {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  expiresAtFromNow,
}
