import type { UserDetails } from '../types/auth'

const P = 'ella_auth_'

const ACCESS = `${P}access`
const REFRESH = `${P}refresh`
const USER = `${P}user`

export function getStoredAccess(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(ACCESS)
}

export function getStoredRefresh(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(REFRESH)
}

export function getStoredUser(): UserDetails | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER)
    if (!raw) return null
    return JSON.parse(raw) as UserDetails
  } catch {
    return null
  }
}

export function persistAuth(tokens: { access: string; refresh: string }, user: UserDetails): void {
  localStorage.setItem(ACCESS, tokens.access)
  localStorage.setItem(REFRESH, tokens.refresh)
  localStorage.setItem(USER, JSON.stringify(user))
}

export function persistAccess(access: string): void {
  localStorage.setItem(ACCESS, access)
}

export function persistUserSnapshot(user: UserDetails): void {
  localStorage.setItem(USER, JSON.stringify(user))
}

export function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
  localStorage.removeItem(USER)
}
