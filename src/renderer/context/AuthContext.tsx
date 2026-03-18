import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated'

export interface AuthUser {
  id: number
  account: string
  status: string
}

export interface CaptchaPayload {
  captchaId: string
  imageBase64: string
  expireAt: string
}

interface AuthContextType {
  authStatus: AuthStatus
  user: AuthUser | null
  isElectronAuthAvailable: boolean
  login: (payload: {
    account: string
    password: string
    captchaId: string
    captchaText: string
  }) => Promise<void>
  register: (payload: {
    account: string
    password: string
    captchaId: string
    captchaText: string
  }) => Promise<{ message: string; user: AuthUser }>
  logout: () => Promise<void>
  getCaptcha: () => Promise<CaptchaPayload>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AuthUser | null>(null)
  const isElectronAuthAvailable = Boolean(window.electron)

  useEffect(() => {
    let active = true
    const bootstrap = async () => {
      if (!window.electron) {
        setAuthStatus('unauthenticated')
        return
      }
      try {
        const session = await window.electron.auth.getSession()
        if (!active) {
          return
        }
        if (session?.user) {
          setUser(session.user)
          setAuthStatus('authenticated')
        } else {
          setAuthStatus('unauthenticated')
        }
      } catch (error) {
        console.error('Failed to check auth session:', error)
        if (active) {
          setAuthStatus('unauthenticated')
        }
      }
    }
    bootstrap()

    window.electron?.onAuthExpired(() => {
      setUser(null)
      setAuthStatus('unauthenticated')
    })

    return () => {
      active = false
      window.electron?.removeAllListeners('auth:expired')
    }
  }, [])

  const login: AuthContextType['login'] = async (payload) => {
    if (!window.electron) {
      throw new Error('当前环境不支持登录能力')
    }
    const result = await window.electron.auth.login(payload)
    setUser(result.user)
    setAuthStatus('authenticated')
  }

  const register: AuthContextType['register'] = async (payload) => {
    if (!window.electron) {
      throw new Error('当前环境不支持注册能力')
    }
    return window.electron.auth.register(payload)
  }

  const logout: AuthContextType['logout'] = async () => {
    if (window.electron) {
      await window.electron.auth.logout()
    }
    setUser(null)
    setAuthStatus('unauthenticated')
  }

  const getCaptcha: AuthContextType['getCaptcha'] = async () => {
    if (!window.electron) {
      throw new Error('当前环境不支持验证码')
    }
    return window.electron.auth.getCaptcha()
  }

  const contextValue = useMemo(
    () => ({
      authStatus,
      user,
      isElectronAuthAvailable,
      login,
      register,
      logout,
      getCaptcha,
    }),
    [authStatus, user, isElectronAuthAvailable],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
