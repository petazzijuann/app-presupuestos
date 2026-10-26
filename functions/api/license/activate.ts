/**
 * POST /api/license/activate
 * Body: { key, device }
 * Devuelve: { ok: true, instanceId, source, email? } | { ok: false, code }
 */
import { fail, json, readJson } from '../../_lib/http'
import { getLicense, isOwnKey, maxDevices, normalize, putLicense } from '../../_lib/kvLicense'
import { isSameProduct, lsActivate, lsDeactivate, mapError } from '../../_lib/lemonsqueezy'
import type { Env } from '../../_lib/types'

type Body = { key?: string; device?: string }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<Body>(request)
  const key = (body?.key ?? '').trim()
  const device = (body?.device ?? 'Dispositivo').slice(0, 60)
  if (!key) return fail('empty')

  try {
    /* ---------------- Claves propias (compras en pesos) ---------------- */
    if (isOwnKey(key)) {
      const record = await getLicense(env, key)
      if (!record || record.active === false) return fail('invalid_key')
      if (record.product !== env.PRODUCT_ID) return fail('wrong_product')

      const limit = maxDevices(env)
      if (record.instances.length >= limit) return fail('device_limit')

      const instanceId = crypto.randomUUID()
      record.instances.push({
        id: instanceId,
        name: device,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      })
      await putLicense(env, key, record)
      return json({ ok: true, instanceId, source: 'futurislabs', email: record.email })
    }

    /* ---------------- Claves de Lemon Squeezy (USD) ---------------- */
    const res = await lsActivate(key, device)
    if (!res.activated || !res.instance) return fail(mapError(res))

    if (!isSameProduct(res, env.LS_PRODUCT_ID)) {
      // La clave es de otro producto: soltamos la instancia que acabamos de crear.
      await lsDeactivate(key, res.instance.id)
      return fail('wrong_product')
    }

    return json({
      ok: true,
      instanceId: res.instance.id,
      source: 'lemonsqueezy',
      email: res.meta?.customer_email,
    })
  } catch {
    return fail('server', 502)
  }
}
