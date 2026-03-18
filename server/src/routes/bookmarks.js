const express = require('express')
const { query } = require('../db')
const { authRequired } = require('../middleware/auth')
const { normalizeFileKey } = require('../utils/validators')

const router = express.Router()
router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `
        SELECT bookmark_id, file_key, text, note, position, created_at, updated_at
        FROM user_bookmarks
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `,
      [req.user.id],
    )

    res.json({
      items: rows.map((item) => ({
        bookmarkId: item.bookmark_id,
        fileKey: item.file_key,
        text: item.text,
        note: item.note,
        position: item.position,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.put('/:bookmarkId', async (req, res, next) => {
  try {
    const bookmarkId = String(req.params.bookmarkId || '').trim()
    const fileKey = normalizeFileKey(req.body?.fileKey || '')
    const text = String(req.body?.text || '').trim()
    const note = req.body?.note ? String(req.body.note) : null
    const position = Number(req.body?.position || 0)

    if (!bookmarkId || !fileKey || !text) {
      res.status(400).json({ message: 'bookmarkId/fileKey/text 不能为空' })
      return
    }

    await query(
      `
        INSERT INTO user_bookmarks (
          user_id, bookmark_id, file_key, text, note, position, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          file_key = VALUES(file_key),
          text = VALUES(text),
          note = VALUES(note),
          position = VALUES(position),
          updated_at = NOW()
      `,
      [req.user.id, bookmarkId, fileKey, text, note, position],
    )

    res.json({ ok: true, bookmarkId })
  } catch (error) {
    next(error)
  }
})

router.delete('/:bookmarkId', async (req, res, next) => {
  try {
    const bookmarkId = String(req.params.bookmarkId || '').trim()
    if (!bookmarkId) {
      res.status(400).json({ message: 'bookmarkId 不能为空' })
      return
    }
    await query('DELETE FROM user_bookmarks WHERE user_id = ? AND bookmark_id = ?', [
      req.user.id,
      bookmarkId,
    ])
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

module.exports = router
