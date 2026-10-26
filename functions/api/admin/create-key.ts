/**
 * POST /api/admin/create-key
 * Header: Authorization: Bearer <ADMIN_TOKEN>
 * Body:   { email, product? }
 * Devuelve: { ok: true, key, product, email }
 *
 * Lo llama n8n cuando se confirma un pago en pesos (Ualá Bis).
 */
import { json, readJson } from '../../_lib/http'
import { generateKey, getLicense, putLicense } from '../../_lib/kvLicense'
import type { Env, KvLicense } from '../../_lib/types'

type Body = { email?: string; product?: string }

const unauthorized = () =>
  new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
  })

/** Comparación en tiempo constante para no filtrar el token. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!env.ADMIN_TOKEN || !token || !safeEqual(token, env.ADMIN_TOKEN)) return unauthorized()

  const body = await readJson<Body>(request)
  const email = (body?.email ?? '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400)
  }
  const product = (body?.product ?? env.PRODUCT_ID ?? '').trim()
  if (!product) return json({ ok: false, error: 'missing_product' }, 400)

  // Reintentamos por si la clave generada ya existía (prácticamente imposible).
  let key = generateKey()
  for (let i = 0; i < 3 && (await getLicense(env, key)); i++) key = generateKey()

  const record: KvLicense = {
    product,
    email,
    createdAt: new Date().toISOString(),
    instances: [],
    active: true,
  }
  await putLicense(env, key, record)

  return json({ ok: true, key, product, email })
}
