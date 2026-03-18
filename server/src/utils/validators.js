function isBlank(text) {
  return !text || !String(text).trim()
}

function validateLoginPayload(payload) {
  const errors = []
  if (isBlank(payload.account)) {
    errors.push('账户不能为空')
  }
  if (isBlank(payload.password)) {
    errors.push('密码不能为空')
  }
  if (isBlank(payload.captchaId) || isBlank(payload.captchaText)) {
    errors.push('验证码不能为空')
  }
  return errors
}

function validateRegisterPayload(payload) {
  const errors = []
  if (isBlank(payload.account)) {
    errors.push('账户不能为空')
  }
  if (isBlank(payload.password)) {
    errors.push('密码不能为空')
  }
  if (isBlank(payload.captchaId) || isBlank(payload.captchaText)) {
    errors.push('验证码不能为空')
  }
  return errors
}

function normalizeFileKey(raw) {
  if (!raw) return ''
  return String(raw)
    .replace(/^cloud:\/\//, '')
    .replace(/\\/g, '/')
    .trim()
}

module.exports = {
  isBlank,
  validateLoginPayload,
  validateRegisterPayload,
  normalizeFileKey,
}
