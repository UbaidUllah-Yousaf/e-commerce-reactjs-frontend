/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full API origin including protocol, no trailing slash. Omit / empty = `/api/v1` (Vite dev proxy). */
  readonly VITE_API_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
