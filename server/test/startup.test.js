const test = require('node:test')
const assert = require('node:assert/strict')
const { validateJwtConfig } = require('../src/utils/startup')

test('validateJwtConfig should fail for short secrets', () => {
  const errors = validateJwtConfig({
    accessSecret: 'short',
    refreshSecret: '',
  })
  assert.equal(errors.length, 2)
})

test('validateJwtConfig should pass for strong secrets', () => {
  const errors = validateJwtConfig({
    accessSecret: '12345678901234567890123456789012',
    refreshSecret: 'abcdefghijklmnopqrstuvwxyzABCDEF',
  })
  assert.deepEqual(errors, [])
})
