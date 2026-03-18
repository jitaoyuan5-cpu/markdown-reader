import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'

const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockGetCaptcha = vi.fn()

let mockAuthContext = {
  login: mockLogin,
  register: mockRegister,
  getCaptcha: mockGetCaptcha,
  isElectronAuthAvailable: true,
}

vi.mock('../context/AuthContext', () => ({
  useAuthContext: () => mockAuthContext,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockRegister.mockReset()
    mockGetCaptcha.mockReset()
    mockAuthContext = {
      login: mockLogin,
      register: mockRegister,
      getCaptcha: mockGetCaptcha,
      isElectronAuthAvailable: true,
    }
    mockGetCaptcha.mockResolvedValue({
      captchaId: 'cap-1',
      imageBase64: btoa('<svg></svg>'),
      expireAt: new Date(Date.now() + 60000).toISOString(),
    })
  })

  it('shows required field validations in login mode', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '登录' }))

    expect(screen.getByText('账户不能为空')).toBeInTheDocument()
    expect(screen.getByText('密码不能为空')).toBeInTheDocument()
    expect(screen.getByText('验证码不能为空')).toBeInTheDocument()
  })

  it('submits login payload when inputs are valid', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('账户'), ' demo ')
    await user.type(screen.getByLabelText('密码'), 'pass123')
    await user.type(screen.getByLabelText('验证码'), 'a1b2')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
    expect(mockLogin).toHaveBeenCalledWith({
      account: 'demo',
      password: 'pass123',
      captchaId: 'cap-1',
      captchaText: 'a1b2',
    })
  })

  it('validates required fields and password match in register mode', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '没有账户？去注册' }))
    await user.click(screen.getByRole('button', { name: '注册' }))
    expect(screen.getByText('账户不能为空')).toBeInTheDocument()
    expect(screen.getByText('密码不能为空')).toBeInTheDocument()
    expect(screen.getByText('确认密码不能为空')).toBeInTheDocument()
    expect(screen.getByText('验证码不能为空')).toBeInTheDocument()

    await user.type(screen.getByLabelText('账户'), 'demo')
    await user.type(screen.getByLabelText('密码'), 'pass123')
    await user.type(screen.getByLabelText('确认密码'), 'pass456')
    await user.type(screen.getByLabelText('验证码'), 'a1b2')
    await user.click(screen.getByRole('button', { name: '注册' }))
    expect(screen.getByText('两次密码不一致')).toBeInTheDocument()
  })

  it('submits register payload and switches back to login mode on success', async () => {
    mockRegister.mockResolvedValueOnce({
      user: { id: 1, account: 'new-user', status: 'active' },
      message: '注册成功，请返回登录',
    })

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '没有账户？去注册' }))
    await user.type(screen.getByLabelText('账户'), ' new-user ')
    await user.type(screen.getByLabelText('密码'), 'pass123')
    await user.type(screen.getByLabelText('确认密码'), 'pass123')
    await user.type(screen.getByLabelText('验证码'), 'a1b2')
    await user.click(screen.getByRole('button', { name: '注册' }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(1)
    })
    expect(mockRegister).toHaveBeenCalledWith({
      account: 'new-user',
      password: 'pass123',
      captchaId: 'cap-1',
      captchaText: 'a1b2',
    })

    await waitFor(() => {
      expect(screen.getByText('注册成功，请返回登录')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('shows backend error and refreshes captcha on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('账户或密码错误'))
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('账户'), 'demo')
    await user.type(screen.getByLabelText('密码'), 'bad-pass')
    await user.type(screen.getByLabelText('验证码'), 'a1b2')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('账户或密码错误')).toBeInTheDocument()
    })
    expect(mockGetCaptcha).toHaveBeenCalledTimes(2)
  })

  it('maps unregistered account error to unified message in login mode', async () => {
    mockLogin.mockRejectedValueOnce(new Error('账户不存在，请先注册'))
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('账户'), 'missing-user')
    await user.type(screen.getByLabelText('密码'), 'pass123')
    await user.type(screen.getByLabelText('验证码'), 'a1b2')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('该账户未注册，请先注册')).toBeInTheDocument()
    })
  })
})
