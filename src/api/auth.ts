import { apiGet, apiPatch, apiPost } from './client'
import type {
  JWTPair,
  LoginCredentials,
  LoginRequest,
  RegisterCredentials,
  RestAuthDetail,
  UserDetails,
} from '../types/auth'

/** Build `LoginRequest` for `POST /api/v1/auth/login/` (OpenAPI: password + email XOR username). */
function toLoginRequest(c: LoginCredentials): LoginRequest {
  const password = c.password
  const email = c.email?.trim()
  const username = c.username?.trim()
  if (email) return { email, password }
  if (username) return { username, password }
  throw new Error('Email or username is required to sign in.')
}

export async function login(credentials: LoginCredentials): Promise<JWTPair> {
  return apiPost<JWTPair>('/auth/login/', toLoginRequest(credentials))
}

export async function register(credentials: RegisterCredentials): Promise<JWTPair> {
  return apiPost<JWTPair>('/auth/registration/', {
    email: credentials.email.trim(),
    password1: credentials.password1,
    password2: credentials.password2,
    ...(credentials.username?.trim() ? { username: credentials.username.trim() } : {}),
  })
}

export async function logoutApi(): Promise<RestAuthDetail | void> {
  try {
    return await apiPost<RestAuthDetail>('/auth/logout/', {})
  } catch {
    return undefined
  }
}

/** `TokenRefresh` / `TokenRefreshRequest` — returns new access only. */
export async function refreshAccess(refreshToken: string): Promise<{ access: string }> {
  return apiPost<{ access: string }>('/auth/token/refresh/', { refresh: refreshToken })
}

/** `POST /auth/token/verify/` — optional proactive access-token check. */
export async function verifyAccessToken(accessToken: string): Promise<void> {
  await apiPost<void>('/auth/token/verify/', { token: accessToken })
}

export async function fetchCurrentUser(): Promise<UserDetails> {
  return apiGet<UserDetails>('/auth/user/')
}

export async function patchCurrentUser(
  patch: Partial<Pick<UserDetails, 'username' | 'first_name' | 'last_name'>>,
): Promise<UserDetails> {
  return apiPatch<UserDetails>('/auth/user/', patch)
}
