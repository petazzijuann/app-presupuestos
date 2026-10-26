/**
 * Cliente de la License API de Lemon Squeezy (compras en USD).
 * Es pública: form-urlencoded y sin API key.
 * https://docs.lemonsqueezy.com/help/licensing/license-api
 */
import type { LicenseErrorCode } from './types'

const BASE = 'https://api.lemonsqueezy.com/v1/licenses'

export type LsResponse = {
  activated?: boolean
  valid?: boolean
  deactivated?: boolean
  error?: string | null
  license_key?: {
    id: number
    status: 'inactive' | 'active' | 'expired' | 'disabled'
    key: string
    activation_limit: number
    activation_usage: number
    expires_at: string | null
  }
  instance?: { id: string; name: string; created_at: string } | null
  meta?: {
    store_id: number
    order_id: number
    product_id: number
    variant_id: number
    customer_email?: string
  }
}

async function call(path: string, params: Record<string, string>): Promise<LsResponse> {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params).toString(),
  })
  // La API responde 400/404 con el detalle en el cuerpo, así que igual lo leemos.
  return (await res.json()) as LsResponse
}

export const lsActivate = (key: string, instanceName: string) =>
  call('activate', { license_key: key, instance_name: instanceName })

export const lsValidate = (key: string, instanceId: string) =>
  call('validate', { license_key: key, instance_id: instanceId })

export const lsDeactivate = (key: string, instanceId: string) =>
  call('deactivate', { license_key: key, instance_id: instanceId })

/** Traduce el error de Lemon Squeezy a nuestros códigos. */
export function mapError(res: LsResponse): LicenseErrorCode {
  const msg = (res.error ?? '').toLowerCase()
  if (!msg) return 'invalid_key'
  if (msg.includes('activation limit')) return 'device_limit'
  if (msg.includes('expired') || msg.includes('disabled') || msg.includes('refund')) return 'expired'
  return 'invalid_key'
}

/** true si la clave pertenece al producto que vende esta app. */
export const isSameProduct = (res: LsResponse, productId: string) =>
  !!res.meta && String(res.meta.product_id) === String(productId).trim()
