/**
 * POST /api/license/validate
 * Body: { key, instanceId }
 * Revalida una licencia ya activada (el cliente la llama cada 7 días).
 */
import { fail, json, readJson } from '../../_lib/http'
import { getLicense, isOwnKey, putLicense } from '../../_lib/kvLicense'
import { isSameProduct, lsValidate, mapError } from '../../_lib/lemonsqueezy'
import type { Env } from '../../_lib/types'

type Body = { key?: string; instanceId?: string }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<Body>(request)
  const key = (body?.key ?? '').trim()
  const instanceId = (body?.instanceId ?? '').trim()
  if (!key || !instanceId) return fail('empty')

  try {
    if (isOwnKey(key)) {
      const record = await getLicense(env, key)
      if (!record || record.active === false) return fail('invalid_key')
      if (record.product !== env.PRODUCT_ID) return fail('wrong_product')

      const instance = record.instances.find((i) => i.id === instanceId)
      if (!instance) return fail('invalid_key')

      instance.lastSeenAt = new Date().toISOString()
      await putLicense(env, key, record)
      return json({ ok: true, instanceId, source: 'futurislabs', email: record.email })
    }

    const res = await lsValidate(key, instanceId)
    if (!res.valid) return fail(mapError(res))
    if (!isSameProduct(res, env.LS_PRODUCT_ID)) return fail('wrong_product')
    if (res.license_key && res.license_key.status !== 'active') return fail('expired')

    return json({
      ok: true,
      instanceId,
      source: 'lemonsqueezy',
      email: res.meta?.customer_email,
    })
  } catch {
    return fail('server', 502)
  }
}
