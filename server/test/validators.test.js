const test = require('node:test')
const assert = require('node:assert/strict')
const {
  validateLoginPayload,
  validateRegisterPayload,
  normalizeFileKey,
} = require('../src/utils/validators')

test('validateLoginPayload returns errors for empty fields', () => {
  const errors = validateLoginPayload({
    account: '',
    password: '',
    captchaId: '',
    captchaText: '',
  })
  assert.equal(errors.length > 0, true)
  assert.equal(errors.includes('账户不能为空'), true)
  assert.equal(errors.includes('密码不能为空'), true)
  assert.equal(errors.includes('验证码不能为空'), true)
})

test('validateRegisterPayload returns errors for empty fields', () => {
  const errors = validateRegisterPayload({
    account: '',
    password: '',
    captchaId: '',
    captchaText: '',
  })
  assert.equal(errors.length > 0, true)
  assert.equal(errors.includes('账户不能为空'), true)
  assert.equal(errors.includes('密码不能为空'), true)
  assert.equal(errors.includes('验证码不能为空'), true)
})

test('normalizeFileKey strips cloud prefix and slashes', () => {
  const fileKey = normalizeFileKey('cloud://C:\\docs\\note.md')
  assert.equal(fileKey, 'C:/docs/note.md')
})
