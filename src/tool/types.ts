/** HERRAMIENTA · Modelo de datos de los presupuestos. */
import type { CurrencyCode } from './money'

/** Oficios soportados: definen qué catálogo viene precargado. */
export type TradeId =
  | 'electricidad'
  | 'plomeria'
  | 'gas'
  | 'pintura'
  | 'albanileria'
  | 'aire'
  | 'carpinteria'

/** Un ítem es material (lo que se compra) o mano de obra (lo que se trabaja). */
export type ItemKind = 'material' | 'obra'

export type UnitId = 'unidad' | 'metro' | 'm2' | 'hora' | 'jornada' | 'boca' | 'global'

export type CatalogItem = {
  id: string
  kind: ItemKind
  name: string
  unit: UnitId
  /** Precio unitario. 0 = todavía sin cargar. */
  price: number
  category: string
}

export type Client = {
  id: string
  name: string
  phone: string
  address: string
}

/** Condiciones por defecto que se copian a cada presupuesto nuevo. */
export type Terms = {
  /** Días que el presupuesto mantiene el precio. */
  validityDays: number
  payment: string
  /** Seña pedida, en % del total. */
  depositPercent: number
  warranty: string
  /** Plazo estimado de ejecución. */
  leadTime: string
  /** Notas al pie del PDF. */
  footer: string
}

export type Business = {
  name: string
  trades: TradeId[]
  /** Clave del logo en IndexedDB (las imágenes no van en localStorage). */
  logoId: string | null
  phone: string
  email: string
  area: string
  /** CUIT / RUT / RFC… opcional. */
  taxId: string
  currency: CurrencyCode
  /** Prefijo de la numeración, por ejemplo "P-". */
  quotePrefix: string
  terms: Terms
  /** IVA: apagado por defecto (la mayoría son monotributistas). */
  vat: { enabled: boolean; percent: number }
}

export type QuoteLine = {
  id: string
  kind: ItemKind
  name: string
  unit: UnitId
  qty: number
  price: number
  /** De qué ítem del catálogo salió (vacío si es un ítem libre). */
  catalogId?: string
}

export type QuoteStatus = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'terminado' | 'cobrado'

export type DiscountKind = 'percent' | 'amount'

export type Quote = {
  id: string
  /** Número ya armado, por ejemplo "P-0007". */
  number: string
  /** Fecha del presupuesto en formato YYYY-MM-DD. */
  date: string
  createdAt: number
  validityDays: number
  clientId: string | null
  /** Dirección de la obra (puede no ser la del cliente). */
  address: string
  description: string
  lines: QuoteLine[]
  discountKind: DiscountKind
  discountValue: number
  vatEnabled: boolean
  vatPercent: number
  depositPercent: number
  leadTime: string
  payment: string
  warranty: string
  notes: string
  /** Claves de las fotos en IndexedDB (hasta 3). */
  photoIds: string[]
  status: QuoteStatus
  /** Cuándo entró en cada estado (para el seguimiento a los 3 días). */
  statusAt: Partial<Record<QuoteStatus, number>>
  /** Lo efectivamente cobrado, si difiere del total (comprobante de trabajo). */
  collected?: number
}

/** Una plantilla es un presupuesto sin cliente, guardado con nombre. */
export type Template = {
  id: string
  name: string
  createdAt: number
  quote: Pick<
    Quote,
    | 'description'
    | 'lines'
    | 'discountKind'
    | 'discountValue'
    | 'depositPercent'
    | 'leadTime'
    | 'payment'
    | 'warranty'
    | 'notes'
    | 'validityDays'
  >
}

export type AppData = {
  business: Business
  catalog: CatalogItem[]
  clients: Client[]
  quotes: Quote[]
  templates: Template[]
  /** false mientras no se completó el asistente de 3 pasos. */
  onboarded: boolean
}
