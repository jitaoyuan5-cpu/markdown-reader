const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { createApp } = require('../src/app')
const db = require('../src/db')
const { sha256 } = require('../src/utils/security')

const smokeEnabled = process.env.ENABLE_SMOKE_DB === '1'
const app = createApp()

async function cleanupUserByAccount(account) {
  const users = await db.query('SELECT id FROM users WHERE account = ?', [account])
  if (users.length === 0) {
    return
  }
  const userId = users[0].id
  await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId])
  await db.query('DELETE FROM user_bookmarks WHERE user_id = ?', [userId])
  await db.query('DELETE FROM user_files WHERE user_id = ?', [userId])
  await db.query('DELETE FROM users WHERE id = ?', [userId])
}

async function seedCaptcha(text, expiresInSeconds = 300) {
  const captchaId = uuidv4()
  await db.query(
    `
      INSERT INTO captcha_challenges (id, code_hash, expire_at, consumed_at, created_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NULL, NOW())
    `,
    [captchaId, sha256(String(text).trim().toUpperCase()), expiresInSeconds],
  )
  return captchaId
}

async function cleanupCaptcha(captchaId) {
  await db.query('DELETE FROM captcha_challenges WHERE id = ?', [captchaId])
}

async function createUser(account, password) {
  const passwordHash = await bcrypt.hash(password, 10)
  await db.query(
    `
      INSERT INTO users (account, password_hash, status, last_login_at, created_at, updated_at)
      VALUES (?, ?, 'active', NULL, NOW(), NOW())
    `,
    [account, passwordHash],
  )
}

test(
  'smoke: login and refresh with real DB',
  { skip: !smokeEnabled },
  async () => {
    const account = `smoke_login_${Date.now()}`
    const password = 'SmokePass#123'
    const captchaText = 'A1B2'

    await cleanupUserByAccount(account)
    await createUser(account, password)
    const captchaId = await seedCaptcha(captchaText, 300)

    try {
      const loginRes = await request(app).post('/api/auth/login').send({
        account,
        password,
        captchaId,
        captchaText,
      })
      assert.equal(loginRes.status, 200)
      assert.equal(loginRes.body.user.account, account)
      assert.equal(typeof loginRes.body.accessToken, 'string')
      assert.equal(typeof loginRes.body.refreshToken, 'string')

      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken: loginRes.body.refreshToken,
      })
      assert.equal(refreshRes.status, 200)
      assert.equal(refreshRes.body.user.account, account)
      assert.equal(typeof refreshRes.body.accessToken, 'string')
      assert.equal(typeof refreshRes.body.refreshToken, 'string')
    } finally {
      await cleanupCaptcha(captchaId)
      await cleanupUserByAccount(account)
    }
  },
)

test(
  'smoke: captcha should be single-use under concurrency with real DB',
  { skip: !smokeEnabled },
  async () => {
    const account = `smoke_concurrent_${Date.now()}`
    const password = 'SmokePass#123'
    const captchaText = 'Z9X8'

    await cleanupUserByAccount(account)
    await createUser(account, password)
    const captchaId = await seedCaptcha(captchaText, 300)

    try {
      const payload = {
        account,
        password,
        captchaId,
        captchaText,
      }
      const [res1, res2] = await Promise.all([
        request(app).post('/api/auth/login').send(payload),
        request(app).post('/api/auth/login').send(payload),
      ])

      const statuses = [res1.status, res2.status].sort((a, b) => a - b)
      assert.deepEqual(statuses, [200, 400])

      const failRes = res1.status === 400 ? res1 : res2
      assert.equal(failRes.body.message.includes('验证码'), true)
    } finally {
      await cleanupCaptcha(captchaId)
      await cleanupUserByAccount(account)
    }
  },
)

test.after(async () => {
  await db.pool.end()
})
