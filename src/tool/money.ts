/** HERRAMIENTA · Monedas, formato y redondeo. */

export type CurrencyCode = 'ARS' | 'USD' | 'MXN' | 'COP' | 'CLP' | 'PEN' | 'UYU' | 'EUR'

export type CurrencyInfo = {
  code: CurrencyCode
  name: string
  locale: string
  /** Decimales que se muestran. */
  decimals: number
  /** Paso de redondeo hacia arriba para los precios sugeridos. */
  step: number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  ARS: { code: 'ARS', name: 'Peso argentino', locale: 'es-AR', decimals: 0, step: 100 },
  USD: { code: 'USD', name: 'Dólar', locale: 'en-US', decimals: 2, step: 0.5 },
  MXN: { code: 'MXN', name: 'Peso mexicano', locale: 'es-MX', decimals: 2, step: 1 },
  COP: { code: 'COP', name: 'Peso colombiano', locale: 'es-CO', decimals: 0, step: 500 },
  CLP: { code: 'CLP', name: 'Peso chileno', locale: 'es-CL', decimals: 0, step: 100 },
  PEN: { code: 'PEN', name: 'Sol peruano', locale: 'es-PE', decimals: 2, step: 0.5 },
  UYU: { code: 'UYU', name: 'Peso uruguayo', locale: 'es-UY', decimals: 0, step: 10 },
  EUR: { code: 'EUR', name: 'Euro', locale: 'es-ES', decimals: 2, step: 0.5 },
}

export const CURRENCY_LIST = Object.values(CURRENCIES)

const cache = new Map<string, Intl.NumberFormat>()
function formatter(code: CurrencyCode, decimals: number) {
  const k = `${code}:${decimals}`
  let f = cache.get(k)
  if (!f) {
    const info = CURRENCIES[code]
    f = new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    cache.set(k, f)
  }
  return f
}

/** Formatea un importe con el símbolo y los separadores de cada país. */
export function formatMoney(value: number, code: CurrencyCode, opts?: { decimals?: number }) {
  if (!Number.isFinite(value)) return '—'
  const info = CURRENCIES[code]
  const decimals = opts?.decimals ?? info.decimals
  return formatter(code, decimals).format(value)
}

/** Formato con más precisión para costos chicos (por ejemplo, 2 g de un insumo). */
export function formatCost(value: number, code: CurrencyCode) {
  const info = CURRENCIES[code]
  if (value !== 0 && Math.abs(value) < Math.pow(10, -info.decimals) * 10) {
    return formatMoney(value, code, { decimals: info.decimals + 2 })
  }
  return formatMoney(value, code)
}

export function formatPercent(value: number, decimals = 1) {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(decimals).replace('.', ',').replace(/,0$/, '')} %`
}

export function formatNumber(value: number, locale = 'es-AR') {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

/** Redondea SIEMPRE hacia arriba al paso de la moneda (nunca deja un precio corto). */
export function roundUpPrice(value: number, code: CurrencyCode): number {
  if (!Number.isFinite(value)) return value
  const step = CURRENCIES[code].step
  if (step <= 0) return value
  const EPS = 1e-9
  const rounded = Math.ceil(value / step - EPS) * step
  return rounded === 0 ? 0 : rounded // evita el -0
}
