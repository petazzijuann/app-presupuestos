/** Helpers de respuesta para las Pages Functions. */
import type { LicenseErrorCode } from './types'

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS })

export const fail = (code: LicenseErrorCode, status = 400) => json({ ok: false, code }, status)

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/** Solo aceptamos POST en todos los endpoints de licencia. */
export const methodNotAllowed = () =>
  new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
