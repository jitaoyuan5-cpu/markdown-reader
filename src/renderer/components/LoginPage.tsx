import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAuthContext } from '../context/AuthContext'

interface FormState {
  account: string
  password: string
  confirmPassword: string
  captchaText: string
}

type AuthMode = 'login' | 'register'
type FormErrorState = Partial<Record<keyof FormState, string>>

export default function LoginPage() {
  const { login, register, getCaptcha, isElectronAuthAvailable } = useAuthContext()
  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState<FormState>({
    account: '',
    password: '',
    confirmPassword: '',
    captchaText: '',
  })
  const [errors, setErrors] = useState<FormErrorState>({})
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImageBase64, setCaptchaImageBase64] = useState('')

  const isRegisterMode = mode === 'register'

  const captchaImageSrc = useMemo(() => {
    if (!captchaImageBase64) {
      return ''
    }
    return `data:image/svg+xml;base64,${captchaImageBase64}`
  }, [captchaImageBase64])

  const fetchCaptcha = async () => {
    if (!isElectronAuthAvailable) {
      setSubmitError('当前环境仅支持页面预览，登录能力请在 Electron 桌面版使用')
      return
    }
    try {
      setCaptchaLoading(true)
      const payload = await getCaptcha()
      setCaptchaId(payload.captchaId)
      setCaptchaImageBase64(payload.imageBase64)
    } catch (error) {
      console.error('Failed to fetch captcha:', error)
      setSubmitError('验证码加载失败，请稍后重试')
    } finally {
      setCaptchaLoading(false)
    }
  }

  useEffect(() => {
    fetchCaptcha()
  }, [isElectronAuthAvailable])

  const validateForm = () => {
    const nextErrors: FormErrorState = {}
    if (!form.account.trim()) {
      nextErrors.account = '账户不能为空'
    }
    if (!form.password.trim()) {
      nextErrors.password = '密码不能为空'
    }
    if (isRegisterMode && !form.confirmPassword.trim()) {
      nextErrors.confirmPassword = '确认密码不能为空'
    }
    if (isRegisterMode && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = '两次密码不一致'
    }
    if (!form.captchaText.trim()) {
      nextErrors.captchaText = '验证码不能为空'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setErrors({})
    setSubmitError('')
    setSubmitSuccess('')
    setForm((prev) => ({ ...prev, password: '', confirmPassword: '', captchaText: '' }))
    fetchCaptcha()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!validateForm()) {
      return
    }

    if (!isElectronAuthAvailable) {
      setSubmitError('当前环境不支持登录，请在 Electron 桌面版运行')
      return
    }

    if (!captchaId) {
      setSubmitError('验证码未准备好，请刷新后重试')
      return
    }

    try {
      setLoading(true)
      if (isRegisterMode) {
        await register({
          account: form.account.trim(),
          password: form.password,
          captchaId,
          captchaText: form.captchaText.trim(),
        })
        setSubmitSuccess('注册成功，请返回登录')
        setForm((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
          captchaText: '',
        }))
        setMode('login')
        fetchCaptcha()
        return
      }

      await login({
        account: form.account.trim(),
        password: form.password,
        captchaId,
        captchaText: form.captchaText.trim(),
      })
    } catch (error: any) {
      const fallbackMessage = isRegisterMode ? '注册失败，请重试' : '登录失败，请重试'
      const rawMessage = error?.message || fallbackMessage
      const message =
        !isRegisterMode &&
        (rawMessage.includes('账户不存在') || rawMessage.includes('请先注册'))
          ? '该账户未注册，请先注册'
          : rawMessage
      setSubmitError(message)
      setForm((prev) => ({ ...prev, captchaText: '' }))
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      className="paper-texture"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: 4,
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--paper-border)',
          boxShadow: '0 8px 32px var(--shadow-color)',
          bgcolor: 'var(--paper-elevated)',
        }}
      >
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
          FlowMark
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isRegisterMode ? '注册账号后开始你的阅读与标注' : '登录后继续你的阅读与标注'}
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="账户"
            value={form.account}
            onChange={(event) => setForm((prev) => ({ ...prev, account: event.target.value }))}
            error={Boolean(errors.account)}
            helperText={errors.account}
            autoComplete="username"
            fullWidth
          />

          <TextField
            label="密码"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            error={Boolean(errors.password)}
            helperText={errors.password}
            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            fullWidth
          />

          {isRegisterMode && (
            <TextField
              label="确认密码"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword}
              autoComplete="new-password"
              fullWidth
            />
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center' }}>
            <TextField
              label="验证码"
              value={form.captchaText}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, captchaText: event.target.value }))
              }
              error={Boolean(errors.captchaText)}
              helperText={errors.captchaText}
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 120,
                  height: 42,
                  border: '1px solid var(--paper-border)',
                  borderRadius: 1,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'background.paper',
                }}
              >
                {captchaLoading ? (
                  <CircularProgress size={18} />
                ) : captchaImageSrc ? (
                  <Box component="img" src={captchaImageSrc} alt="captcha" sx={{ width: '100%', height: '100%' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    验证码
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchCaptcha}
                disabled={captchaLoading || !isElectronAuthAvailable}
              >
                刷新
              </Button>
            </Box>
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}
          {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

          <Button
            type="submit"
            variant="contained"
            disabled={loading || captchaLoading || !isElectronAuthAvailable}
          >
            {loading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                {isRegisterMode ? '注册中...' : '登录中...'}
              </>
            ) : isRegisterMode ? (
              '注册'
            ) : (
              '登录'
            )}
          </Button>

          {isRegisterMode ? (
            <Button variant="text" onClick={() => switchMode('login')}>
              返回登录
            </Button>
          ) : (
            <Button variant="text" onClick={() => switchMode('register')}>
              没有账户？去注册
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
