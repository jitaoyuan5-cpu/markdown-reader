const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const migrationSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/001_init.sql'),
  'utf-8',
)

test('migration should include required tables', () => {
  const requiredTables = [
    'users',
    'captcha_challenges',
    'refresh_tokens',
    'user_files',
    'user_bookmarks',
  ]
  for (const table of requiredTables) {
    assert.equal(
      migrationSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      true,
      `missing table: ${table}`,
    )
  }
})

test('migration should include required keys and indexes', () => {
  const requiredContracts = [
    'UNIQUE KEY uk_user_file (user_id, file_key)',
    'UNIQUE KEY uk_user_bookmark (user_id, bookmark_id)',
    'INDEX idx_expire_at (expire_at)',
    'INDEX idx_user_id (user_id)',
    'INDEX idx_user_file (user_id, file_key)',
  ]
  for (const contractText of requiredContracts) {
    assert.equal(
      migrationSql.includes(contractText),
      true,
      `missing contract: ${contractText}`,
    )
  }
})
