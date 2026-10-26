/** HERRAMIENTA · Valores iniciales, plantilla de presupuesto y datos de ejemplo. */
import { DAY, formatQuoteNumber, nextQuoteNumber } from './calc'
import { seedCatalog } from './trades'
import type {
  AppData,
  Business,
  CatalogItem,
  Client,
  Quote,
  QuoteLine,
  Template,
  Terms,
} from './types'

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** Fecha de hoy en formato YYYY-MM-DD, en la hora local del celular. */
export function today(now = Date.now()): string {
  const d = new Date(now)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const defaultTerms: Terms = {
  validityDays: 15,
  payment: '50 % al comenzar y 50 % al terminar el trabajo.',
  depositPercent: 50,
  warranty: '6 meses de garantía sobre la mano de obra.',
  leadTime: 'A convenir con el cliente.',
  footer: 'Los materiales no incluidos en este presupuesto corren por cuenta del cliente.',
}

export const defaultBusiness: Business = {
  name: '',
  trades: [],
  logoId: null,
  phone: '',
  email: '',
  area: '',
  taxId: '',
  currency: 'ARS',
  quotePrefix: 'P-',
  terms: { ...defaultTerms },
  // Apagado a propósito: la mayoría son monotributistas y no discriminan IVA.
  vat: { enabled: false, percent: 21 },
}

export const emptyData = (): AppData => ({
  business: { ...defaultBusiness, terms: { ...defaultTerms } },
  catalog: [],
  clients: [],
  quotes: [],
  templates: [],
  onboarded: false,
})

export function newLine(p: Partial<QuoteLine> = {}): QuoteLine {
  return { id: uid(), kind: 'obra', name: '', unit: 'unidad', qty: 1, price: 0, ...p }
}

/** Presupuesto nuevo con las condiciones por defecto del negocio ya puestas. */
export function newQuote(business: Business, quotes: Quote[], now = Date.now()): Quote {
  return {
    id: uid(),
    number: nextQuoteNumber(quotes, business.quotePrefix),
    date: today(now),
    createdAt: now,
    validityDays: business.terms.validityDays,
    clientId: null,
    address: '',
    description: '',
    lines: [],
    discountKind: 'percent',
    discountValue: 0,
    vatEnabled: business.vat.enabled,
    vatPercent: business.vat.percent,
    depositPercent: business.terms.depositPercent,
    leadTime: business.terms.leadTime,
    payment: business.terms.payment,
    warranty: business.terms.warranty,
    notes: '',
    photoIds: [],
    status: 'borrador',
    statusAt: { borrador: now },
  }
}

/** Copia de un presupuesto: número nuevo, fecha de hoy y vuelta a borrador. */
export function duplicateQuote(src: Quote, quotes: Quote[], prefix: string, now = Date.now()): Quote {
  return {
    ...src,
    id: uid(),
    number: nextQuoteNumber(quotes, prefix),
    date: today(now),
    createdAt: now,
    lines: src.lines.map((l) => ({ ...l, id: uid() })),
    // Las fotos no se copian: son del trabajo original.
    photoIds: [],
    status: 'borrador',
    statusAt: { borrador: now },
    collected: undefined,
  }
}

export function templateFromQuote(quote: Quote, name: string, now = Date.now()): Template {
  return {
    id: uid(),
    name,
    createdAt: now,
    quote: {
      description: quote.description,
      lines: quote.lines.map((l) => ({ ...l, id: uid() })),
      discountKind: quote.discountKind,
      discountValue: quote.discountValue,
      depositPercent: quote.depositPercent,
      leadTime: quote.leadTime,
      payment: quote.payment,
      warranty: quote.warranty,
      notes: quote.notes,
      validityDays: quote.validityDays,
    },
  }
}

export function quoteFromTemplate(
  template: Template,
  business: Business,
  quotes: Quote[],
  now = Date.now()
): Quote {
  const base = newQuote(business, quotes, now)
  return {
    ...base,
    ...template.quote,
    lines: template.quote.lines.map((l) => ({ ...l, id: uid() })),
  }
}

/* ------------------------------- Ejemplo ------------------------------- */

const priced = (catalog: CatalogItem[], prices: Record<string, number>): CatalogItem[] =>
  catalog.map((item) => ({ ...item, price: prices[item.name] ?? item.price }))

/** Precios de ejemplo (orientativos, octubre 2026) para que se vea completo. */
const SAMPLE_PRICES: Record<string, number> = {
  'Boca de luz nueva': 38_000,
  'Tomacorriente nuevo': 38_000,
  'Punto de TV / datos': 42_000,
  'Cambio de llave o tecla': 18_000,
  'Cambio de térmica': 26_000,
  'Cambio de disyuntor': 34_000,
  'Armado de tablero': 180_000,
  'Tablero de obra provisorio': 95_000,
  'Cableado por metro': 6_500,
  'Canalización embutida por metro': 12_000,
  'Cañería a la vista por metro': 8_000,
  'Puesta a tierra con jabalina': 85_000,
  'Instalación de artefacto de luz': 22_000,
  'Colocación de ventilador de techo': 45_000,
  'Búsqueda de falla': 30_000,
  'Medición y certificado de instalación': 120_000,
  'Jornada de electricista': 95_000,
  'Cable unipolar 2,5 mm (metro)': 1_900,
  'Cable unipolar 4 mm (metro)': 2_900,
  'Caño corrugado 3/4" (metro)': 1_100,
  'Caja rectangular': 1_500,
  'Llave térmica 16 A': 14_000,
  'Disyuntor diferencial': 48_000,
  'Módulo de tomacorriente': 5_200,
  'Tablero de embutir 8 módulos': 36_000,
}

const find = (catalog: CatalogItem[], name: string) => catalog.find((i) => i.name === name)

const lineFrom = (catalog: CatalogItem[], name: string, qty: number): QuoteLine => {
  const item = find(catalog, name)
  return newLine({
    kind: item?.kind ?? 'obra',
    name: item?.name ?? name,
    unit: item?.unit ?? 'unidad',
    qty,
    price: item?.price ?? 0,
    catalogId: item?.id,
  })
}

/**
 * Ejemplo cargable de un click desde el estado vacío: un electricista con
 * catálogo con precios, 3 clientes y 4 presupuestos en distintos estados.
 */
export function sampleData(now = Date.now()): AppData {
  const catalog = priced(seedCatalog(['electricidad'], uid), SAMPLE_PRICES)

  const business: Business = {
    ...defaultBusiness,
    name: 'Electricidad Rivas',
    trades: ['electricidad'],
    phone: '541155667788',
    email: 'rivas.electricidad@ejemplo.com',
    area: 'CABA y zona norte del Gran Buenos Aires',
    taxId: '20-31456789-4',
    currency: 'ARS',
    quotePrefix: 'P-',
    terms: { ...defaultTerms },
  }

  const clients: Client[] = [
    { id: uid(), name: 'Marcela Duarte', phone: '541144556677', address: 'Av. Cabildo 2340, 5.º B, CABA' },
    { id: uid(), name: 'Consorcio Güemes 1120', phone: '541133445566', address: 'Güemes 1120, CABA' },
    { id: uid(), name: 'Panadería La Esquina', phone: '541122334455', address: 'Olazábal 3455, CABA' },
  ]

  const base = (n: number, over: Partial<Quote>): Quote => ({
    ...newQuote(business, [], now),
    id: uid(),
    number: formatQuoteNumber(business.quotePrefix, n),
    ...over,
  })

  const quotes: Quote[] = [
    base(1, {
      date: today(now - 22 * DAY),
      createdAt: now - 22 * DAY,
      clientId: clients[2].id,
      address: 'Olazábal 3455, CABA',
      description: 'Tablero nuevo para el horno y circuito independiente para la cámara de frío.',
      lines: [
        lineFrom(catalog, 'Armado de tablero', 1),
        lineFrom(catalog, 'Cableado por metro', 24),
        lineFrom(catalog, 'Disyuntor diferencial', 1),
        lineFrom(catalog, 'Llave térmica 16 A', 3),
        lineFrom(catalog, 'Jornada de electricista', 2),
      ],
      depositPercent: 50,
      leadTime: '3 días de trabajo, arrancando el lunes.',
      status: 'cobrado',
      statusAt: {
        borrador: now - 22 * DAY,
        enviado: now - 21 * DAY,
        aceptado: now - 19 * DAY,
        terminado: now - 12 * DAY,
        cobrado: now - 10 * DAY,
      },
    }),
    base(2, {
      date: today(now - 9 * DAY),
      createdAt: now - 9 * DAY,
      clientId: clients[1].id,
      address: 'Güemes 1120, CABA — palier y cocheras',
      description: 'Recambio de luminarias del palier y puesta a tierra del portón eléctrico.',
      lines: [
        lineFrom(catalog, 'Instalación de artefacto de luz', 8),
        lineFrom(catalog, 'Puesta a tierra con jabalina', 1),
        lineFrom(catalog, 'Cableado por metro', 18),
        lineFrom(catalog, 'Jornada de electricista', 1),
      ],
      discountKind: 'percent',
      discountValue: 5,
      depositPercent: 40,
      leadTime: 'Dos jornadas, a coordinar con el administrador.',
      status: 'aceptado',
      statusAt: { borrador: now - 9 * DAY, enviado: now - 8 * DAY, aceptado: now - 5 * DAY },
    }),
    base(3, {
      date: today(now - 6 * DAY),
      createdAt: now - 6 * DAY,
      clientId: clients[0].id,
      address: 'Av. Cabildo 2340, 5.º B, CABA',
      description: 'Dos bocas nuevas en la cocina y cambio de la térmica que salta.',
      lines: [
        lineFrom(catalog, 'Tomacorriente nuevo', 2),
        lineFrom(catalog, 'Cambio de térmica', 1),
        lineFrom(catalog, 'Canalización embutida por metro', 6),
        lineFrom(catalog, 'Caja rectangular', 2),
      ],
      depositPercent: 0,
      leadTime: 'Una mañana de trabajo.',
      // Enviado hace 5 días: la lista lo va a marcar para hacer seguimiento.
      status: 'enviado',
      statusAt: { borrador: now - 6 * DAY, enviado: now - 5 * DAY },
    }),
    base(4, {
      date: today(now),
      createdAt: now,
      clientId: clients[0].id,
      address: 'Av. Cabildo 2340, 5.º B, CABA — lavadero',
      description: 'Punto para el lavarropas nuevo, con cable propio desde el tablero.',
      lines: [
        lineFrom(catalog, 'Tomacorriente nuevo', 1),
        lineFrom(catalog, 'Cable unipolar 4 mm (metro)', 12),
      ],
      status: 'borrador',
      statusAt: { borrador: now },
    }),
  ]

  const templates: Template[] = [
    templateFromQuote(
      {
        ...quotes[2],
        description: 'Boca nueva con canalización embutida, materiales incluidos.',
        lines: [
          lineFrom(catalog, 'Boca de luz nueva', 1),
          lineFrom(catalog, 'Canalización embutida por metro', 3),
          lineFrom(catalog, 'Caja rectangular', 1),
          lineFrom(catalog, 'Cable unipolar 2,5 mm (metro)', 8),
        ],
      },
      'Boca de luz nueva (estándar)',
      now
    ),
  ]

  return { business, catalog, clients, quotes, templates, onboarded: true }
}

/* ------------------------------ Migración ------------------------------ */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const n = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Normaliza datos viejos o importados para que nunca falte un campo. */
export function migrate(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const d = raw as Partial<AppData>
  const b = (d.business ?? {}) as Partial<Business>

  const business: Business = {
    ...base.business,
    ...b,
    trades: Array.isArray(b.trades) ? b.trades : [],
    logoId: typeof b.logoId === 'string' ? b.logoId : null,
    quotePrefix: str(b.quotePrefix, base.business.quotePrefix),
    terms: { ...defaultTerms, ...(b.terms ?? {}) },
    vat: { ...base.business.vat, ...(b.vat ?? {}) },
  }

  return {
    business,
    catalog: Array.isArray(d.catalog)
      ? d.catalog.map((i) => ({
          id: str(i?.id) || uid(),
          kind: i?.kind === 'material' ? 'material' : 'obra',
          name: str(i?.name),
          unit: i?.unit ?? 'unidad',
          price: n(i?.price),
          category: str(i?.category, 'General'),
        }))
      : [],
    clients: Array.isArray(d.clients)
      ? d.clients.map((c) => ({
          id: str(c?.id) || uid(),
          name: str(c?.name),
          phone: str(c?.phone),
          address: str(c?.address),
        }))
      : [],
    quotes: Array.isArray(d.quotes)
      ? d.quotes.map((q) => ({
          ...newQuote(business, [], q?.createdAt ?? Date.now()),
          ...q,
          lines: Array.isArray(q?.lines) ? q.lines.map((l) => ({ ...newLine(), ...l })) : [],
          photoIds: Array.isArray(q?.photoIds) ? q.photoIds.filter((p) => typeof p === 'string') : [],
          statusAt: (q?.statusAt ?? {}) as Quote['statusAt'],
        }))
      : [],
    templates: Array.isArray(d.templates)
      ? d.templates.filter((t) => t && typeof t === 'object' && Array.isArray(t.quote?.lines))
      : [],
    onboarded: d.onboarded === true,
  }
}
