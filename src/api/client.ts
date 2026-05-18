/**
 * Ecommerce API (OpenAPI 3.0.3, `info.version` 0.0.0): all paths under `/api/v1/…`.
 *
 * Base URL: `VITE_API_ORIGIN` + `/api/v1`, or same-origin `/api/v1` (Vite dev proxy → Django).
 * Auth: JWT Bearer (`Authorization: Bearer <access>`) from `POST /auth/login/` or registration.
 * On 401, retries once after `POST /auth/token/refresh/` with stored refresh token.
 */
import {
  clearAuthStorage,
  getStoredAccess,
  getStoredRefresh,
  persistAccess,
} from '../lib/tokenStorage'

export function getApiV1Base(): string {
  const origin = import.meta.env.VITE_API_ORIGIN?.trim()
  if (origin) {
    return `${origin.replace(/\/$/, '')}/api/v1`
  }
  return '/api/v1'
}

function csrfCookieValue(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/\bcsrftoken=([^;]+)/)
  return m ? decodeURIComponent(m[1].trim()) : null
}

const defaultFetchOpts: Pick<RequestInit, 'credentials'> = {
  credentials: 'include',
}

function mergeAuthHeaders(headers: Headers): void {
  if (typeof localStorage === 'undefined') return
  const token = getStoredAccess()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    headers.delete('Authorization')
  }
}

function shouldAttemptRefresh401(path: string): boolean {
  const p = path.toLowerCase()
  return (
    !p.includes('/auth/token/refresh') &&
    !p.includes('/auth/token/verify') &&
    !p.includes('/auth/login') &&
    !p.includes('/auth/registration')
  )
}

async function refreshAccessSilently(): Promise<boolean> {
  const refresh = getStoredRefresh()
  if (!refresh) {
    clearAuthStorage()
    return false
  }
  try {
    const url = `${getApiV1Base()}/auth/token/refresh/`
    const response = await fetch(url, {
      method: 'POST',
      ...defaultFetchOpts,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) {
      clearAuthStorage()
      return false
    }
    const data = (await response.json()) as { access: string }
    if (!data.access) {
      clearAuthStorage()
      return false
    }
    persistAccess(data.access)
    return true
  } catch {
    clearAuthStorage()
    return false
  }
}

async function fetchWithAuthRetry(
  path: string,
  init: RequestInit,
  retryOn401: boolean,
): Promise<Response> {
  const url = `${getApiV1Base()}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(url, { ...init, ...defaultFetchOpts })
  if (response.status === 401 && retryOn401 && shouldAttemptRefresh401(path)) {
    const ok = await refreshAccessSilently()
    if (ok) {
      const headers = new Headers(init.headers)
      mergeAuthHeaders(headers)
      return fetch(url, { ...init, headers, ...defaultFetchOpts })
    }
  }
  return response
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  mergeAuthHeaders(headers)

  const response = await fetchWithAuthRetry(
    path,
    { method: 'GET', headers },
    true,
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

/** GET that returns `null` on 404 (e.g. optional resources like size chart by tag). */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const headers = new Headers({ Accept: 'application/json' })
  mergeAuthHeaders(headers)

  const response = await fetchWithAuthRetry(
    path,
    { method: 'GET', headers },
    true,
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

type JsonBodyInit = Omit<RequestInit, 'body'> & { json?: unknown }

export async function apiRequest<T>(
  path: string,
  method: string,
  init: JsonBodyInit = {},
  retryOn401 = true,
): Promise<T> {
  const urlPath = path.startsWith('/') ? path : `/${path}`
  const headers = new Headers(init.headers ?? undefined)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  mergeAuthHeaders(headers)

  const hasExplicitBody =
    typeof init.body === 'string' || init.body instanceof FormData || init.body instanceof Blob
  let body = init.body
  if (!hasExplicitBody && init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }

  const write = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
  const csrf = csrfCookieValue()
  if (write && csrf && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', csrf)
  }

  const response = await fetchWithAuthRetry(
    urlPath,
    {
      ...init,
      method,
      headers,
      body,
    },
    retryOn401,
  )

  const text = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(text || `Request failed: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204 || !text.trim()) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Expected JSON response')
  }
}

export function apiPost<T>(path: string, json?: unknown): Promise<T> {
  return apiRequest<T>(path, 'POST', { json })
}

export function apiPatch<T>(path: string, json: unknown): Promise<T> {
  return apiRequest<T>(path, 'PATCH', { json })
}

export function apiPut<T>(path: string, json?: unknown): Promise<T> {
  return apiRequest<T>(path, 'PUT', { json })
}

export function apiDelete(path: string): Promise<void> {
  return apiRequest<void>(path, 'DELETE')
}
