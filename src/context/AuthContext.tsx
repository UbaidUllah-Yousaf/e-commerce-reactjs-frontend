import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi, logoutApi, register as registerApi, fetchCurrentUser } from '../api/auth'
import { clearAuthStorage, getStoredAccess, getStoredUser, persistAuth } from '../lib/tokenStorage'
import type { JWTPair, LoginCredentials, RegisterCredentials, UserDetails } from '../types/auth'

interface AuthContextValue {
  user: UserDetails | null
  loading: boolean
  isAuthenticated: boolean
  login: (c: LoginCredentials) => Promise<void>
  register: (c: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async () => {
    if (!getStoredAccess()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await fetchCurrentUser()
      setUser(me)
    } catch {
      const stale = getStoredUser()
      setUser(stale)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (getStoredAccess()) {
      const stale = getStoredUser()
      if (stale) setUser(stale)
    }
    void hydrate()
  }, [hydrate])

  const applyAuthPayload = useCallback((data: JWTPair) => {
    persistAuth({ access: data.access, refresh: data.refresh }, data.user)
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (c: LoginCredentials) => {
      const { redirectTo, ...credentials } = c
      const data = await loginApi(credentials)
      applyAuthPayload(data)
      const to =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/account'
      await navigate(to, { replace: true })
    },
    [applyAuthPayload, navigate],
  )

  const register = useCallback(
    async (c: RegisterCredentials) => {
      const data = await registerApi(c)
      applyAuthPayload(data)
      await navigate('/account', { replace: true })
    },
    [applyAuthPayload, navigate],
  )

  const logout = useCallback(async () => {
    await logoutApi()
    clearAuthStorage()
    setUser(null)
    await navigate('/', { replace: true })
  }, [navigate])

  const refreshUser = useCallback(async () => {
    if (!getStoredAccess()) return
    try {
      const me = await fetchCurrentUser()
      setUser(me)
    } catch {
      /* keep cached */
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
