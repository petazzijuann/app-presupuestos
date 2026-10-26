/** Claves propias FL-XXXX-XXXX-XXXX guardadas en Cloudflare KV. */
import type { Env, KvLicense } from './types'

/** Sin caracteres que se confundan al dictar una clave por teléfono. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const isOwnKey = (key: string) => /^FL-/i.test(key)

export const normalize = (key: string) => key.trim().toUpperCase().replace(/\s+/g, '')

export const maxDevices = (env: Env) => Number(env.MAX_DEVICES ?? '3') || 3

/** Genera una clave con formato FL-XXXX-XXXX-XXXX. */
export function generateKey(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  return `FL-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars
    .slice(8, 12)
    .join('')}`
}

export async function getLicense(env: Env, key: string): Promise<KvLicense | null> {
  return await env.LICENSES.get<KvLicense>(normalize(key), 'json')
}

export async function putLicense(env: Env, key: string, value: KvLicense): Promise<void> {
  await env.LICENSES.put(normalize(key), JSON.stringify(value))
}
