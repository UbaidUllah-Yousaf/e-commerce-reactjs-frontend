/**
 * Auth types aligned with Ecommerce API OpenAPI 3.0.3
 * (`components.schemas.UserDetails`, `JWT`, `LoginRequest`, `ShopifyRegisterRequest`, …).
 */

export interface UserDetails {
  pk: number
  username: string
  email: string
  first_name?: string
  last_name?: string
}

/** `components.schemas.JWT` — access + refresh + embedded user. */
export interface JWTPair {
  access: string
  refresh: string
  user: UserDetails
}

/**
 * `components.schemas.LoginRequest` — only `password` is required;
 * send `email` or `username` (not both required).
 */
export interface LoginRequest {
  username?: string
  email?: string
  password: string
}

export interface LoginCredentials extends LoginRequest {
  /** Post-login client redirect (not sent to API). */
  redirectTo?: string
}

/** `components.schemas.ShopifyRegisterRequest` (+ optional username). */
export interface RegisterCredentials {
  email: string
  password1: string
  password2: string
  username?: string
}

export interface RestAuthDetail {
  detail: string
}
