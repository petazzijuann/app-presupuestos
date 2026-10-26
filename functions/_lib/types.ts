/** Tipos compartidos por las Pages Functions. */

export type Env = {
  /** KV donde viven las claves propias (compras en pesos). Binding: LICENSES */
  LICENSES: KVNamespace
  /** ID numérico del producto en Lemon Squeezy (rechazamos claves de otros productos). */
  LS_PRODUCT_ID: string
  /** Identificador del producto para las claves propias. Por ejemplo: costos */
  PRODUCT_ID: string
  /** Token para crear claves desde n8n. */
  ADMIN_TOKEN: string
  /** Máximo de dispositivos por licencia (por defecto 3). */
  MAX_DEVICES?: string
}

export type LicenseErrorCode =
  | 'invalid_key'
  | 'device_limit'
  | 'wrong_product'
  | 'expired'
  | 'server'
  | 'empty'

export type Instance = {
  id: string
  name: string
  createdAt: string
  lastSeenAt?: string
}

/** Lo que guardamos en KV para cada clave FL-XXXX-XXXX-XXXX */
export type KvLicense = {
  product: string
  email: string
  createdAt: string
  instances: Instance[]
  /** Si está en false, la clave queda bloqueada (reembolso, contracargo…). */
  active?: boolean
}
