const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const request = require('supertest')

process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxyzABCDEF'

const db = require('../src/db')
const { sha256 } = require('../src/utils/security')
const { createApp } = require('../src/app')

function createMockState() {
  return {
    users: [],
    captchas: new Map(),
    refreshTokens: [],
    nextUserId: 1,
    nextRefreshId: 1,
  }
}

function installDbMock(state) {
  db.query = async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('UPDATE captcha_challenges SET consumed_at = NOW()')) {
      const [captchaId, textHash] = params
      const challenge = state.captchas.get(captchaId)
      if (!challenge) {
        return { affectedRows: 0 }
      }
      const expired = challenge.expireAt.getTime() <= Date.now()
      if (challenge.consumedAt || expired || challenge.codeHash !== textHash) {
        return { affectedRows: 0 }
      }
      challenge.consumedAt = new Date()
      return { affectedRows: 1 }
    }

    if (normalized.startsWith('SELECT id FROM users WHERE account = ? LIMIT 1')) {
      const account = params[0]
      const user = state.users.find((item) => item.account === account)
      return user ? [{ id: user.id }] : []
    }

    if (normalized.startsWith('SELECT id, account, password_hash, status FROM users WHERE account = ?')) {
      const account = params[0]
      const user = state.users.find((item) => item.account === account)
      return user ? [user] : []
    }

    if (normalized.startsWith('SELECT id, account, status FROM users WHERE account = ? LIMIT 1')) {
      const account = params[0]
      const user = state.users.find((item) => item.account === account)
      return user ? [{ id: user.id, account: user.account, status: user.status }] : []
    }

    if (
      normalized.startsWith(
        'INSERT INTO users (account, password_hash, status, last_login_at, created_at, updated_at)',
      )
    ) {
      const [account, passwordHash] = params
      if (state.users.some((item) => item.account === account)) {
        const error = new Error('Duplicate entry')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      const user = {
        id: state.nextUserId++,
        account,
        password_hash: passwordHash,
        status: 'active',
      }
      state.users.push(user)
      return { insertId: user.id }
    }

    if (normalized.startsWith('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?')) {
      return { affectedRows: 1 }
    }

    if (normalized.startsWith('INSERT INTO refresh_tokens (user_id, token_hash, expire_at, revoked_at, created_at)')) {
      const [userId, tokenHash, expireAt] = params
      state.refreshTokens.push({
        id: state.nextRefreshId++,
        user_id: userId,
        token_hash: tokenHash,
        expire_at: new Date(expireAt),
        revoked_at: null,
      })
      return { insertId: state.nextRefreshId - 1 }
    }

    if (normalized.startsWith('SELECT id, user_id, expire_at, revoked_at FROM refresh_tokens WHERE token_hash = ?')) {
      const tokenHash = params[0]
      const row = state.refreshTokens.find((item) => item.token_hash === tokenHash)
      return row ? [row] : []
    }

    if (normalized.startsWith('SELECT id, account, status FROM users WHERE id = ? LIMIT 1')) {
      const userId = Number(params[0])
      const user = state.users.find((item) => item.id === userId)
      if (!user) {
        return []
      }
      return [{ id: user.id, account: user.account, status: user.status }]
    }

    if (normalized.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?')) {
      const id = Number(params[0])
      const row = state.refreshTokens.find((item) => item.id === id)
      if (row) {
        row.revoked_at = new Date()
      }
      return { affectedRows: row ? 1 : 0 }
    }

    if (normalized.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?')) {
      const tokenHash = params[0]
      const row = state.refreshTokens.find((item) => item.token_hash === tokenHash)
      if (row) {
        row.revoked_at = new Date()
      }
      return { affectedRows: row ? 1 : 0 }
    }

    if (normalized.startsWith('INSERT INTO captcha_challenges')) {
      return { affectedRows: 1 }
    }

    throw new Error(`Unhandled SQL in test mock: ${normalized}`)
  }
}

function seedCaptcha(state, captchaId, text, expiresInMs = 60000) {
  state.captchas.set(captchaId, {
    id: captchaId,
    codeHash: sha256(String(text).trim().toUpperCase()),
    expireAt: new Date(Date.now() + expiresInMs),
    consumedAt: null,
  })
}

test('auth register validates required fields', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  const response = await request(app).post('/api/auth/register').send({})
  assert.equal(response.status, 400)
  assert.equal(response.body.message, '账户不能为空')
})

test('auth register creates account when payload valid', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  seedCaptcha(state, 'cap-reg-1', 'A1B2')
  const response = await request(app).post('/api/auth/register').send({
    account: 'new-user',
    password: 'Pass1234!',
    captchaId: 'cap-reg-1',
    captchaText: 'A1B2',
  })

  assert.equal(response.status, 201)
  assert.equal(response.body.user.account, 'new-user')
  assert.equal(response.body.message, '注册成功，请返回登录')
  assert.equal(state.users.length, 1)
})

test('auth register rejects duplicate account', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  const passwordHash = await bcrypt.hash('CorrectPass', 10)
  state.users.push({
    id: 1,
    account: 'demo',
    password_hash: passwordHash,
    status: 'active',
  })

  seedCaptcha(state, 'cap-reg-2', 'QWER')
  const response = await request(app).post('/api/auth/register').send({
    account: 'demo',
    password: 'Pass1234!',
    captchaId: 'cap-reg-2',
    captchaText: 'QWER',
  })

  assert.equal(response.status, 409)
  assert.equal(response.body.message, '账户已存在')
})

test('auth login validates required fields', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  const response = await request(app).post('/api/auth/login').send({})
  assert.equal(response.status, 400)
  assert.equal(response.body.message, '账户不能为空')
})

test('auth login rejects unregistered account', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  seedCaptcha(state, 'cap-1', 'A1B2')
  const response = await request(app).post('/api/auth/login').send({
    account: 'new-user',
    password: 'Pass1234!',
    captchaId: 'cap-1',
    captchaText: 'A1B2',
  })

  assert.equal(response.status, 404)
  assert.equal(response.body.message, '账户不存在，请先注册')
  assert.equal(state.users.length, 0)
})

test('auth login rejects wrong password for existing account', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  const passwordHash = await bcrypt.hash('CorrectPass', 10)
  state.users.push({
    id: 1,
    account: 'demo',
    password_hash: passwordHash,
    status: 'active',
  })

  seedCaptcha(state, 'cap-2', 'QWER')
  const response = await request(app).post('/api/auth/login').send({
    account: 'demo',
    password: 'WrongPass',
    captchaId: 'cap-2',
    captchaText: 'QWER',
  })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, '账户或密码错误')
})

test('captcha should be consumed exactly once under concurrency', async () => {
  const state = createMockState()
  installDbMock(state)
  const app = createApp()

  const passwordHash = await bcrypt.hash('Pass1234!', 10)
  state.users.push({
    id: 1,
    account: 'concurrent-user',
    password_hash: passwordHash,
    status: 'active',
  })

  seedCaptcha(state, 'cap-once', 'ZXCV')
  const payload = {
    account: 'concurrent-user',
    password: 'Pass1234!',
    captchaId: 'cap-once',
    captchaText: 'ZXCV',
  }

  const [res1, res2] = await Promise.all([
    request(app).post('/api/auth/login').send(payload),
    request(app).post('/api/auth/login').send(payload),
  ])

  const statuses = [res1.status, res2.status].sort((a, b) => a - b)
  assert.deepEqual(statuses, [200, 400])

  const failRes = res1.status === 400 ? res1 : res2
  assert.equal(failRes.body.message.includes('验证码'), true)
})
