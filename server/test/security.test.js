const test = require('node:test')
const assert = require('node:assert/strict')

process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxyzABCDEF'
const {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../src/utils/security')

test('sha256 should be deterministic', () => {
  assert.equal(sha256('abc'), sha256('abc'))
  assert.notEqual(sha256('abc'), sha256('abcd'))
})

test('access token sign and verify', () => {
  const token = signAccessToken({ id: 1, account: 'demo' })
  const payload = verifyAccessToken(token)
  assert.equal(payload.sub, '1')
  assert.equal(payload.account, 'demo')
})

test('refresh token sign and verify', () => {
  const { refreshToken, tokenId } = signRefreshToken({ id: 2, account: 'user2' })
  const payload = verifyRefreshToken(refreshToken)
  assert.equal(payload.sub, '2')
  assert.equal(payload.account, 'user2')
  assert.equal(Boolean(payload.jti), true)
  assert.equal(typeof tokenId, 'string')
})
