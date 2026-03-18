const { verifyAccessToken } = require('../utils/security')

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null

  if (!token) {
    res.status(401).json({ message: '未登录或会话已过期' })
    return
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = {
      id: Number(payload.sub),
      account: payload.account,
    }
    next()
  } catch (error) {
    res.status(401).json({ message: '登录态无效，请重新登录' })
  }
}

module.exports = {
  authRequired,
}
