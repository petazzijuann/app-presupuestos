/** KIT · Cliente de licencias (habla con /api/license/*). */
import { config } from '../config'
import { readJSON, remove, writeJSON } from './storage'

export type LicenseSource = 'lemonsqueezy' | 'futurislabs' | 'dev'

export type StoredLicense = {
  key: string
  instanceId: string
  /** Última validación exitosa contra el servidor (epoch ms). */
  checkedAt: number
  source: LicenseSource
  email?: string
}

export type LicenseErrorCode =
  | 'invalid_key'
  | 'device_limit'
  | 'wrong_product'
  | 'expired'
  | 'offline'
  | 'server'
  | 'empty'

export const LICENSE_MESSAGES: Record<LicenseErrorCode, string> = {
  invalid_key: 'Esa clave no es válida. Revisa que esté completa y sin espacios.',
  device_limit: `Tu clave ya está activada en ${config.maxDevices} dispositivos. Desactivala en alguno para usarla acá.`,
  wrong_product: 'Esa clave es de otro producto de Futurislabs, no de ' + config.appName + '.',
  expired: 'Tu clave está vencida o fue dada de baja. Escríbenos y lo resolvemos.',
  offline: 'No pudimos conectarnos. Revisa tu internet y prueba de nuevo.',
  server: 'Tuvimos un problema al validar la clave. Prueba de nuevo en un minuto.',
  empty: 'Escribe tu clave de licencia.',
}

export class LicenseError extends Error {
  constructor(public code: LicenseErrorCode) {
    super(LICENSE_MESSAGES[code])
  }
}

const STORE = 'license'
const DAY = 86_400_000

export const loadLicense = () => readJSON<StoredLicense | null>(STORE, null)
export const saveLicense = (l: StoredLicense) => writeJSON(STORE, l)
export const clearLicense = () => remove(STORE)

export function normalizeKey(raw: string) {
  return raw.trim().replace(/\s+/g, '')
}

/** Nombre legible del dispositivo, para que el usuario reconozca sus activaciones. */
export function deviceName() {
  const ua = navigator.userAgent
  const os = /iPhone|iPad/i.test(ua)
    ? 'iPhone/iPad'
    : /Android/i.test(ua)
      ? 'Android'
      : /Mac/i.test(ua)
        ? 'Mac'
        : /Windows/i.test(ua)
          ? 'Windows'
          : 'Navegador'
  return `${config.appName} · ${os}`
}

type ApiOk = { ok: true; instanceId: string; source: LicenseSource; email?: string }
type ApiFail = { ok: false; code: LicenseErrorCode }

async function post(path: string, body: Record<string, unknown>): Promise<ApiOk> {
  let res: Response
  try {
    res = await fetch(`/api/license/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new LicenseError('offline')
  }
  let data: ApiOk | ApiFail
  try {
    data = (await res.json()) as ApiOk | ApiFail
  } catch {
    throw new LicenseError('server')
  }
  if (!data.ok) throw new LicenseError(data.code ?? 'server')
  return data
}

const isDevKey = (key: string) =>
  import.meta.env.DEV && key.toUpperCase() === config.license.devKey

/** Activa la clave en este dispositivo y la guarda. */
export async function activate(rawKey: string): Promise<StoredLicense> {
  const key = normalizeKey(rawKey)
  if (!key) throw new LicenseError('empty')

  if (isDevKey(key)) {
    const dev: StoredLicense = {
      key: config.license.devKey,
      instanceId: 'dev',
      checkedAt: Date.now(),
      source: 'dev',
    }
    saveLicense(dev)
    return dev
  }

  const data = await post('activate', { key, device: deviceName() })
  const license: StoredLicense = {
    key,
    instanceId: data.instanceId,
    checkedAt: Date.now(),
    source: data.source,
    email: data.email,
  }
  saveLicense(license)
  return license
}

/** Revalida contra el servidor. Devuelve la licencia actualizada. */
export async function validate(license: StoredLicense): Promise<StoredLicense> {
  if (license.source === 'dev') return license
  await post('validate', { key: license.key, instanceId: license.instanceId })
  const updated = { ...license, checkedAt: Date.now() }
  saveLicense(updated)
  return updated
}

/** Libera el cupo de este dispositivo. */
export async function deactivate(license: StoredLicense): Promise<void> {
  if (license.source !== 'dev') {
    try {
      await post('deactivate', { key: license.key, instanceId: license.instanceId })
    } catch (e) {
      // Si la clave ya no existe del otro lado, igual la soltamos acá.
      if (!(e instanceof LicenseError) || e.code === 'server') throw e
    }
  }
  clearLicense()
}

/* ------------------------------ Vigencia ------------------------------ */

export const needsRevalidation = (l: StoredLicense, now = Date.now()) =>
  l.source !== 'dev' && now - l.checkedAt > config.license.revalidateEveryDays * DAY

export const withinOfflineGrace = (l: StoredLicense, now = Date.now()) =>
  now - l.checkedAt <= config.license.offlineGraceDays * DAY

export function offlineDaysLeft(l: StoredLicense, now = Date.now()) {
  const left = config.license.offlineGraceDays - Math.floor((now - l.checkedAt) / DAY)
  return Math.max(0, left)
}
