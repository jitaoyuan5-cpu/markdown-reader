import { Store } from './store'

export interface AuthUser {
  id: number
  account: string
  status: string
}

interface SessionData {
  user: AuthUser
  refreshToken: string
}

interface RequestOptions {
  method?: string
  body?: string
  headers?: Record<string, string>
  auth?: boolean
  retryOnUnauthorized?: boolean
}

export class BackendClient {
  private store: Store
  private onSessionExpired: () => void
  private baseUrl: string
  private accessToken: string | null = null

  constructor(store: Store, onSessionExpired: () => void) {
    this.store = store
    this.onSessionExpired = onSessionExpired
    this.baseUrl =
      process.env.FLOWMARK_API_BASE_URL ||
      this.store.get('backendApiBaseUrl', 'http://127.0.0.1:4000/api')!
  }

  getSession(): SessionData | null {
    return this.store.get('authSession', null) as SessionData | null
  }

  clearSession(): void {
    this.accessToken = null
    this.store.set('authSession', null)
  }

  private setSession(session: SessionData, accessToken?: string): void {
    if (accessToken) {
      this.accessToken = accessToken
    }
    this.store.set('authSession', session)
  }

  async getCaptcha(): Promise<any> {
    return this.request('/auth/captcha', {
      method: 'GET',
      auth: false,
      retryOnUnauthorized: false,
    })
  }

  async login(payload: {
    account: string
    password: string
    captchaId: string
    captchaText: string
  }): Promise<any> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      auth: false,
      retryOnUnauthorized: false,
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setSession({
      user: response.user,
      refreshToken: response.refreshToken,
    }, response.accessToken)
    return response
  }

  async register(payload: {
    account: string
    password: string
    captchaId: string
    captchaText: string
  }): Promise<any> {
    return this.request('/auth/register', {
      method: 'POST',
      auth: false,
      retryOnUnauthorized: false,
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async logout(): Promise<void> {
    const session = this.getSession()
    if (session?.refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          auth: false,
          retryOnUnauthorized: false,
          body: JSON.stringify({ refreshToken: session.refreshToken }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.warn('Logout request failed:', error)
      }
    }
    this.clearSession()
  }

  async listFiles(): Promise<any> {
    return this.request('/files', { method: 'GET' })
  }

  async upsertFile(payload: { fileKey: string; fileName: string; content: string }): Promise<any> {
    const encodedFileKey = encodeURIComponent(payload.fileKey)
    return this.request(`/files/${encodedFileKey}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async listBookmarks(): Promise<any> {
    return this.request('/bookmarks', { method: 'GET' })
  }

  async upsertBookmark(payload: {
    bookmarkId: string
    fileKey: string
    text: string
    note?: string
    position: number
  }): Promise<any> {
    const encodedBookmarkId = encodeURIComponent(payload.bookmarkId)
    return this.request(`/bookmarks/${encodedBookmarkId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async deleteBookmark(bookmarkId: string): Promise<any> {
    const encodedBookmarkId = encodeURIComponent(bookmarkId)
    return this.request(`/bookmarks/${encodedBookmarkId}`, {
      method: 'DELETE',
    })
  }

  private async refreshAccessToken(): Promise<boolean> {
    const session = this.getSession()
    if (!session?.refreshToken) {
      return false
    }

    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        auth: false,
        retryOnUnauthorized: false,
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      this.setSession({
        user: response.user,
        refreshToken: response.refreshToken,
      }, response.accessToken)
      return true
    } catch {
      return false
    }
  }

  private async request(path: string, options: RequestOptions = {}): Promise<any> {
    const {
      auth = true,
      retryOnUnauthorized = true,
      headers = {},
      ...rest
    } = options

    const session = this.getSession()
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    }
    if (auth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`
    }

    const fetchFn = (globalThis as any).fetch
    if (typeof fetchFn !== 'function') {
      throw new Error('Current runtime does not support fetch')
    }

    const response = await fetchFn(`${this.baseUrl}${path}`, {
      ...rest,
      headers: requestHeaders,
    })

    if (response.status === 401 && auth && retryOnUnauthorized) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        return this.request(path, { ...options, retryOnUnauthorized: false })
      }
      this.clearSession()
      this.onSessionExpired()
      throw new Error('登录态已过期，请重新登录')
    }

    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`)
    }

    return data
  }
}
