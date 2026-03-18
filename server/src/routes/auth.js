const express = require('express')
const bcrypt = require('bcryptjs')
const svgCaptcha = require('svg-captcha')
const db = require('../db')
const config = require('../config')
const {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  expiresAtFromNow,
} = require('../utils/security')
const { validateLoginPayload, validateRegisterPayload } = require('../utils/validators')

const router = express.Router()

function mapUser(user) {
  return {
    id: user.id,
    account: user.account,
    status: user.status,
  }
}

async function consumeCaptchaAndValidate(captchaId, captchaText) {
  const textHash = sha256(String(captchaText).trim().toUpperCase())
  const updateResult = await db.query(
    `
      UPDATE captcha_challenges
      SET consumed_at = NOW()
      WHERE id = ?
        AND consumed_at IS NULL
        AND expire_at > NOW()
        AND code_hash = ?
    `,
    [captchaId, textHash],
  )
  if (updateResult.affectedRows !== 1) {
    return { ok: false, message: '验证码错误或已失效，请刷新后重试' }
  }

  return { ok: true }
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user)
  const { refreshToken } = signRefreshToken(user)
  await db.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expire_at, revoked_at, created_at)
      VALUES (?, ?, ?, NULL, NOW())
    `,
    [user.id, sha256(refreshToken), expiresAtFromNow(config.jwt.refreshExpiresDays)],
  )

  return { accessToken, refreshToken }
}

router.get('/captcha', async (_, res, next) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1ilI',
      noise: 2,
      color: true,
      width: 120,
      height: 42,
    })

    const captchaId = require('uuid').v4()
    const expireAt = new Date(Date.now() + config.captcha.expiresSeconds * 1000)
    await db.query(
      `
        INSERT INTO captcha_challenges (id, code_hash, expire_at, consumed_at, created_at)
        VALUES (?, ?, ?, NULL, NOW())
      `,
      [captchaId, sha256(captcha.text.toUpperCase()), expireAt],
    )

    res.json({
      captchaId,
      imageBase64: Buffer.from(captcha.data).toString('base64'),
      expireAt: expireAt.toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const { account, password, captchaId, captchaText } = req.body || {}
    const errors = validateRegisterPayload({ account, password, captchaId, captchaText })
    if (errors.length > 0) {
      res.status(400).json({ message: errors[0], errors })
      return
    }

    const captchaResult = await consumeCaptchaAndValidate(captchaId, captchaText)
    if (!captchaResult.ok) {
      res.status(400).json({ message: captchaResult.message })
      return
    }

    const accountTrimmed = String(account).trim()
    const existing = await db.query(
      `
        SELECT id
        FROM users
        WHERE account = ?
        LIMIT 1
      `,
      [accountTrimmed],
    )
    if (existing.length > 0) {
      res.status(409).json({ message: '账户已存在' })
      return
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    try {
      await db.query(
        `
          INSERT INTO users (account, password_hash, status, last_login_at, created_at, updated_at)
          VALUES (?, ?, 'active', NULL, NOW(), NOW())
        `,
        [accountTrimmed, passwordHash],
      )
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: '账户已存在' })
        return
      }
      throw error
    }

    const users = await db.query(
      `
        SELECT id, account, status
        FROM users
        WHERE account = ?
        LIMIT 1
      `,
      [accountTrimmed],
    )

    res.status(201).json({
      user: mapUser(users[0]),
      message: '注册成功，请返回登录',
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { account, password, captchaId, captchaText } = req.body || {}
    const errors = validateLoginPayload({ account, password, captchaId, captchaText })
    if (errors.length > 0) {
      res.status(400).json({ message: errors[0], errors })
      return
    }

    const captchaResult = await consumeCaptchaAndValidate(captchaId, captchaText)
    if (!captchaResult.ok) {
      res.status(400).json({ message: captchaResult.message })
      return
    }

    const accountTrimmed = String(account).trim()
    const users = await db.query(
      `
        SELECT id, account, password_hash, status
        FROM users
        WHERE account = ?
        LIMIT 1
      `,
      [accountTrimmed],
    )

    if (users.length === 0) {
      res.status(404).json({ message: '账户不存在，请先注册' })
      return
    }

    const user = users[0]
    const passwordMatched = await bcrypt.compare(String(password), user.password_hash)
    if (!passwordMatched) {
      res.status(401).json({ message: '账户或密码错误' })
      return
    }
    if (user.status !== 'active') {
      res.status(403).json({ message: '账号已被禁用' })
      return
    }
    await db.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?', [
      user.id,
    ])

    const { accessToken, refreshToken } = await issueTokens(user)
    res.json({
      user: mapUser(user),
      accessToken,
      refreshToken,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken
    if (!refreshToken) {
      res.status(400).json({ message: '缺少 refreshToken' })
      return
    }

    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      res.status(401).json({ message: 'refreshToken 无效' })
      return
    }

    const tokenHash = sha256(refreshToken)
    const tokenRows = await db.query(
      `
        SELECT id, user_id, expire_at, revoked_at
        FROM refresh_tokens
        WHERE token_hash = ?
        LIMIT 1
      `,
      [tokenHash],
    )
    if (tokenRows.length === 0) {
      res.status(401).json({ message: 'refreshToken 不存在' })
      return
    }

    const tokenRecord = tokenRows[0]
    if (tokenRecord.revoked_at) {
      res.status(401).json({ message: 'refreshToken 已失效' })
      return
    }
    if (new Date(tokenRecord.expire_at).getTime() < Date.now()) {
      res.status(401).json({ message: 'refreshToken 已过期' })
      return
    }

    const users = await db.query(
      'SELECT id, account, status FROM users WHERE id = ? LIMIT 1',
      [Number(payload.sub)],
    )
    if (users.length === 0 || users[0].status !== 'active') {
      res.status(401).json({ message: '用户不存在或不可用' })
      return
    }
    const user = users[0]

    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [tokenRecord.id])
    const nextTokens = await issueTokens(user)

    res.json({
      user: mapUser(user),
      ...nextTokens,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken
    if (refreshToken) {
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [
        sha256(refreshToken),
      ])
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

module.exports = router
