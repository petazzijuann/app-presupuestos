/**
 * POST /api/license/deactivate
 * Body: { key, instanceId }
 * Libera el cupo de este dispositivo.
 */
import { fail, json, readJson } from '../../_lib/http'
import { getLicense, isOwnKey, putLicense } from '../../_lib/kvLicense'
import { lsDeactivate, mapError } from '../../_lib/lemonsqueezy'
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
      if (!record) return fail('invalid_key')
      record.instances = record.instances.filter((i) => i.id !== instanceId)
      await putLicense(env, key, record)
      return json({ ok: true, instanceId, source: 'futurislabs' })
    }

    const res = await lsDeactivate(key, instanceId)
    if (!res.deactivated) return fail(mapError(res))
    return json({ ok: true, instanceId, source: 'lemonsqueezy' })
  } catch {
    return fail('server', 502)
  }
}
