/**
 * HERRAMIENTA · Toda la matemática del presupuesto vive acá, en funciones
 * puras y testeadas. Ningún componente de React hace cuentas por su cuenta.
 */
import type {
  CatalogItem,
  DiscountKind,
  ItemKind,
  Quote,
  QuoteLine,
  QuoteStatus,
} from './types'

const num = (n: number) => (Number.isFinite(n) ? n : 0)
const positive = (n: number) => Math.max(0, num(n))

export const DAY = 86_400_000

/* --------------------------------- Totales --------------------------------- */

/** Importe de un renglón: cantidad × precio unitario. */
export function lineTotal(line: Pick<QuoteLine, 'qty' | 'price'>): number {
  return positive(line.qty) * positive(line.price)
}

/** Suma los renglones de un tipo (material o mano de obra). */
export function subtotalByKind(lines: QuoteLine[], kind: ItemKind): number {
  return lines.reduce((acc, l) => (l.kind === kind ? acc + lineTotal(l) : acc), 0)
}

/**
 * Descuento resuelto a un importe concreto. Nunca puede superar el subtotal:
 * un descuento mayor dejaría un total negativo.
 */
export function discountAmount(subtotal: number, kind: DiscountKind, value: number): number {
  const base = positive(subtotal)
  const raw = kind === 'percent' ? base * (positive(value) / 100) : positive(value)
  return Math.min(base, raw)
}

export type QuoteTotals = {
  /** Subtotal de materiales. */
  materials: number
  /** Subtotal de mano de obra. */
  labor: number
  /** materials + labor, antes del descuento. */
  subtotal: number
  discount: number
  /** Base sobre la que se calcula el IVA (subtotal − descuento). */
  net: number
  /** Importe de IVA. 0 si está desactivado. */
  vat: number
  total: number
  /** Seña pedida. */
  deposit: number
  /** Lo que queda por cobrar contra la entrega. */
  balance: number
}

/** Un único cálculo por presupuesto: lo que consume toda la interfaz y el PDF. */
export function quoteTotals(
  quote: Pick<
    Quote,
    'lines' | 'discountKind' | 'discountValue' | 'vatEnabled' | 'vatPercent' | 'depositPercent'
  >
): QuoteTotals {
  const materials = subtotalByKind(quote.lines, 'material')
  const labor = subtotalByKind(quote.lines, 'obra')
  const subtotal = materials + labor
  const discount = discountAmount(subtotal, quote.discountKind, quote.discountValue)
  const net = subtotal - discount
  const vat = quote.vatEnabled ? net * (positive(quote.vatPercent) / 100) : 0
  const total = net + vat
  const deposit = total * (Math.min(100, positive(quote.depositPercent)) / 100)
  return {
    materials,
    labor,
    subtotal,
    discount,
    net,
    vat,
    total,
    deposit,
    balance: total - deposit,
  }
}

/* ------------------------------- Numeración ------------------------------- */

/** Cuántos dígitos usa el contador: P-0001. */
export const NUMBER_DIGITS = 4

export function formatQuoteNumber(prefix: string, n: number): string {
  const safe = Math.max(1, Math.floor(num(n)) || 1)
  return `${prefix}${String(safe).padStart(NUMBER_DIGITS, '0')}`
}

/** Saca el contador de un número ya emitido, o null si no coincide el prefijo. */
export function parseQuoteNumber(prefix: string, value: string): number | null {
  if (!value.startsWith(prefix)) return null
  const rest = value.slice(prefix.length)
  if (!/^\d+$/.test(rest)) return null
  return Number(rest)
}

/**
 * Siguiente número correlativo: uno más que el mayor emitido con ese prefijo.
 * Borrar un presupuesto no recicla su número (así no se repiten ante el cliente).
 */
export function nextQuoteNumber(quotes: Pick<Quote, 'number'>[], prefix: string): string {
  let max = 0
  for (const q of quotes) {
    const n = parseQuoteNumber(prefix, q.number)
    if (n !== null && n > max) max = n
  }
  return formatQuoteNumber(prefix, max + 1)
}

/* --------------------------------- Vigencia --------------------------------- */

/** Fecha YYYY-MM-DD mostrada como dd/mm/aaaa. */
export function formatDate(iso: string): string {
  const [y, m, d] = (iso ?? '').split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

/** Fecha (YYYY-MM-DD) hasta la que vale el presupuesto. */
export function validUntil(date: string, validityDays: number): string {
  const base = new Date(`${date}T12:00:00`)
  if (Number.isNaN(base.getTime())) return date
  base.setDate(base.getDate() + Math.max(0, Math.floor(num(validityDays))))
  return base.toISOString().slice(0, 10)
}

export function isExpired(quote: Pick<Quote, 'date' | 'validityDays'>, now = Date.now()): boolean {
  const limit = new Date(`${validUntil(quote.date, quote.validityDays)}T23:59:59`)
  if (Number.isNaN(limit.getTime())) return false
  return now > limit.getTime()
}

/* -------------------------- Actualización de precios -------------------------- */

/**
 * Sube (o baja, con % negativo) los precios del catálogo. Si viene `category`,
 * toca solo esa. Los ítems sin precio cargado quedan en 0: multiplicar 0 no
 * sirve de nada y es mejor que el usuario lo vea vacío.
 */
export function bumpPrices(
  catalog: CatalogItem[],
  percent: number,
  category?: string
): CatalogItem[] {
  const factor = 1 + num(percent) / 100
  return catalog.map((item) => {
    if (category && item.category !== category) return item
    if (item.price <= 0) return item
    return { ...item, price: Math.max(0, Math.round(item.price * factor * 100) / 100) }
  })
}

export function categoriesOf(catalog: CatalogItem[]): string[] {
  return [...new Set(catalog.map((i) => i.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )
}

/* -------------------------------- Seguimiento -------------------------------- */

/** Días que hay que esperar antes de sugerir un seguimiento. */
export const FOLLOW_UP_DAYS = 3

/** Días desde que se envió, o null si todavía no se envió. */
export function daysSinceSent(quote: Pick<Quote, 'statusAt'>, now = Date.now()): number | null {
  const sentAt = quote.statusAt?.enviado
  if (!sentAt) return null
  return Math.floor((now - sentAt) / DAY)
}

/**
 * true si está "Enviado" hace 3 días o más y el cliente no contestó.
 * Un presupuesto aceptado, rechazado o cobrado ya tuvo respuesta.
 */
export function needsFollowUp(
  quote: Pick<Quote, 'status' | 'statusAt'>,
  now = Date.now(),
  days = FOLLOW_UP_DAYS
): boolean {
  if (quote.status !== 'enviado') return false
  const since = daysSinceSent(quote, now)
  return since !== null && since >= days
}

/* ---------------------------------- Estados ---------------------------------- */

export const STATUS_ORDER: QuoteStatus[] = [
  'borrador',
  'enviado',
  'aceptado',
  'rechazado',
  'terminado',
  'cobrado',
]

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  terminado: 'Terminado',
  cobrado: 'Cobrado',
}

/** Estados que cuentan como "el cliente dijo sí". */
const WON: QuoteStatus[] = ['aceptado', 'terminado', 'cobrado']
/** Estados en los que ya hubo una respuesta del cliente. */
const ANSWERED: QuoteStatus[] = [...WON, 'rechazado']

export const isWon = (status: QuoteStatus): boolean => WON.includes(status)
export const isAnswered = (status: QuoteStatus): boolean => ANSWERED.includes(status)

/** Qué estado se propone como próximo paso (el botón grande de la ficha). */
export function nextStatus(status: QuoteStatus): QuoteStatus | null {
  switch (status) {
    case 'borrador':
      return 'enviado'
    case 'enviado':
      return 'aceptado'
    case 'aceptado':
      return 'terminado'
    case 'terminado':
      return 'cobrado'
    default:
      return null
  }
}

/* ------------------------------ Resumen del mes ------------------------------ */

export type MonthSummary = {
  /** Año y mes (0-11) del resumen. */
  year: number
  month: number
  /** Cuánto presupuestaste (todo lo emitido en el mes, sin contar borradores). */
  quoted: number
  /** Cuánto te aceptaron. */
  accepted: number
  /** Presupuestos emitidos y aceptados, en cantidad. */
  sentCount: number
  acceptedCount: number
  /** Aceptados sobre los que ya tuvieron respuesta, en %. Null si nadie contestó. */
  acceptanceRate: number | null
  /** Aceptado o terminado pero todavía sin cobrar. */
  pendingCollection: number
}

const sameMonth = (date: string, year: number, month: number) => {
  const d = new Date(`${date}T12:00:00`)
  return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month
}

/**
 * Resumen del mes de `now`. Los borradores no se cuentan: todavía no salieron
 * a la calle. "Pendiente de cobro" sí mira todos los meses, porque lo que
 * importa es la plata que falta entrar.
 */
export function monthSummary(quotes: Quote[], now = Date.now()): MonthSummary {
  const ref = new Date(now)
  const year = ref.getFullYear()
  const month = ref.getMonth()

  let quoted = 0
  let accepted = 0
  let sentCount = 0
  let acceptedCount = 0
  let answeredCount = 0
  let pendingCollection = 0

  for (const q of quotes) {
    const total = quoteTotals(q).total
    if (q.status !== 'borrador' && q.status !== 'cobrado') {
      if (isWon(q.status)) pendingCollection += total
    }
    if (!sameMonth(q.date, year, month) || q.status === 'borrador') continue
    quoted += total
    sentCount++
    if (isAnswered(q.status)) answeredCount++
    if (isWon(q.status)) {
      accepted += total
      acceptedCount++
    }
  }

  return {
    year,
    month,
    quoted,
    accepted,
    sentCount,
    acceptedCount,
    acceptanceRate: answeredCount > 0 ? (acceptedCount / answeredCount) * 100 : null,
    pendingCollection,
  }
}

/* --------------------------------- Catálogo --------------------------------- */

/** Normaliza para buscar sin tildes ni mayúsculas (se escribe con una mano). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Buscador del catálogo: todas las palabras tienen que aparecer. */
export function searchCatalog(catalog: CatalogItem[], query: string): CatalogItem[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return catalog
  return catalog.filter((item) => {
    const hay = normalize(`${item.name} ${item.category}`)
    return words.every((w) => hay.includes(w))
  })
}
