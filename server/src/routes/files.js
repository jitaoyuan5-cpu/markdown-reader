const express = require('express')
const crypto = require('crypto')
const { query } = require('../db')
const { authRequired } = require('../middleware/auth')
const { normalizeFileKey } = require('../utils/validators')

const router = express.Router()

router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `
        SELECT file_key, file_name, content, updated_at
        FROM user_files
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `,
      [req.user.id],
    )

    res.json({
      items: rows.map((item) => ({
        fileKey: item.file_key,
        fileName: item.file_name,
        content: item.content,
        updatedAt: item.updated_at,
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.put('/:fileKey', async (req, res, next) => {
  try {
    const fileKey = normalizeFileKey(decodeURIComponent(req.params.fileKey || ''))
    const fileName = String(req.body?.fileName || '').trim()
    const content = String(req.body?.content || '')

    if (!fileKey) {
      res.status(400).json({ message: 'fileKey 不能为空' })
      return
    }

    const safeFileName = fileName || fileKey.split('/').pop() || 'Untitled'
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')
    await query(
      `
        INSERT INTO user_files (user_id, file_key, file_name, content, content_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          file_name = VALUES(file_name),
          content = VALUES(content),
          content_hash = VALUES(content_hash),
          updated_at = NOW()
      `,
      [req.user.id, fileKey, safeFileName, content, contentHash],
    )

    res.json({
      ok: true,
      fileKey,
      fileName: safeFileName,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
