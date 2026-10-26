import { describe, expect, it } from 'vitest'
import {
  DAY,
  FOLLOW_UP_DAYS,
  bumpPrices,
  businessGaps,
  followUpQuotes,
  categoriesOf,
  daysSinceSent,
  discountAmount,
  formatQuoteNumber,
  isExpired,
  lineTotal,
  monthSummary,
  needsFollowUp,
  nextQuoteNumber,
  nextStatus,
  parseQuoteNumber,
  quoteTotals,
  searchCatalog,
  subtotalByKind,
  validUntil,
} from './calc'
import { sampleData } from './defaults'
import type { CatalogItem, Quote, QuoteLine, QuoteStatus } from './types'

/* ------------------------------- Ayudantes ------------------------------- */

let seq = 0
const line = (p: Partial<QuoteLine> = {}): QuoteLine => ({
  id: `l${++seq}`,
  kind: 'material',
  name: 'Ítem',
  unit: 'unidad',
  qty: 1,
  price: 0,
  ...p,
})

const quote = (p: Partial<Quote> = {}): Quote => ({
  id: `q${++seq}`,
  number: 'P-0001',
  date: '2026-10-10',
  createdAt: 0,
  validityDays: 15,
  clientId: null,
  address: '',
  description: '',
  lines: [],
  discountKind: 'percent',
  discountValue: 0,
  vatEnabled: false,
  vatPercent: 21,
  depositPercent: 0,
  leadTime: '',
  payment: '',
  warranty: '',
  notes: '',
  photoIds: [],
  status: 'borrador',
  statusAt: {},
  ...p,
})

/** Dos renglones: 10.000 de material + 40.000 de mano de obra = 50.000. */
const baseLines = () => [
  line({ kind: 'material', name: 'Caño', qty: 10, price: 1_000 }),
  line({ kind: 'obra', name: 'Instalación', qty: 2, price: 20_000 }),
]

/* --------------------------------- Totales --------------------------------- */

describe('totales del presupuesto', () => {
  it('suma cantidad por precio y separa material de mano de obra', () => {
    const lines = baseLines()
    expect(lineTotal(lines[0])).toBe(10_000)
    expect(subtotalByKind(lines, 'material')).toBe(10_000)
    expect(subtotalByKind(lines, 'obra')).toBe(40_000)

    const t = quoteTotals(quote({ lines }))
    expect(t.subtotal).toBe(50_000)
    expect(t.total).toBe(50_000)
  })

  it('ignora cantidades y precios negativos o inválidos', () => {
    const t = quoteTotals(
      quote({
        lines: [
          line({ qty: -5, price: 1_000 }),
          line({ qty: 2, price: -100 }),
          line({ qty: Number.NaN, price: 1_000 }),
          line({ qty: 3, price: 1_000 }),
        ],
      })
    )
    expect(t.subtotal).toBe(3_000)
  })

  it('aplica el descuento por porcentaje', () => {
    const t = quoteTotals(quote({ lines: baseLines(), discountKind: 'percent', discountValue: 10 }))
    expect(t.discount).toBe(5_000)
    expect(t.net).toBe(45_000)
    expect(t.total).toBe(45_000)
  })

  it('aplica el descuento por monto fijo', () => {
    const t = quoteTotals(quote({ lines: baseLines(), discountKind: 'amount', discountValue: 7_500 }))
    expect(t.discount).toBe(7_500)
    expect(t.total).toBe(42_500)
  })

  it('nunca deja un total negativo aunque el descuento se pase', () => {
    expect(discountAmount(50_000, 'amount', 90_000)).toBe(50_000)
    expect(discountAmount(50_000, 'percent', 150)).toBe(50_000)
    const t = quoteTotals(quote({ lines: baseLines(), discountKind: 'amount', discountValue: 1e9 }))
    expect(t.total).toBe(0)
    expect(t.balance).toBe(0)
  })

  it('con IVA desactivado no suma nada, aunque el % esté cargado', () => {
    const t = quoteTotals(quote({ lines: baseLines(), vatEnabled: false, vatPercent: 21 }))
    expect(t.vat).toBe(0)
    expect(t.total).toBe(50_000)
  })

  it('con IVA activado lo calcula sobre el subtotal menos el descuento', () => {
    const t = quoteTotals(
      quote({
        lines: baseLines(),
        discountKind: 'percent',
        discountValue: 10,
        vatEnabled: true,
        vatPercent: 21,
      })
    )
    expect(t.net).toBe(45_000)
    expect(t.vat).toBeCloseTo(9_450, 6)
    expect(t.total).toBeCloseTo(54_450, 6)
  })

  it('calcula seña y saldo sobre el total final', () => {
    const t = quoteTotals(
      quote({ lines: baseLines(), vatEnabled: true, vatPercent: 21, depositPercent: 50 })
    )
    expect(t.total).toBeCloseTo(60_500, 6)
    expect(t.deposit).toBeCloseTo(30_250, 6)
    expect(t.balance).toBeCloseTo(30_250, 6)
    expect(t.deposit + t.balance).toBeCloseTo(t.total, 6)
  })

  it('una seña del 0 % deja el saldo igual al total y del 100 % lo deja en cero', () => {
    const sin = quoteTotals(quote({ lines: baseLines(), depositPercent: 0 }))
    expect(sin.deposit).toBe(0)
    expect(sin.balance).toBe(50_000)

    const todo = quoteTotals(quote({ lines: baseLines(), depositPercent: 100 }))
    expect(todo.deposit).toBe(50_000)
    expect(todo.balance).toBe(0)
  })

  it('un presupuesto sin renglones da todo en cero', () => {
    const t = quoteTotals(quote({ depositPercent: 30, vatEnabled: true }))
    expect(t).toMatchObject({ subtotal: 0, vat: 0, total: 0, deposit: 0, balance: 0 })
  })
})

/* ------------------------------- Numeración ------------------------------- */

describe('numeración correlativa', () => {
  it('arma el número con el prefijo y cuatro dígitos', () => {
    expect(formatQuoteNumber('P-', 1)).toBe('P-0001')
    expect(formatQuoteNumber('P-', 42)).toBe('P-0042')
    expect(formatQuoteNumber('PRESU-', 1234)).toBe('PRESU-1234')
    expect(formatQuoteNumber('P-', 12_345)).toBe('P-12345')
  })

  it('empieza en 1 cuando no hay presupuestos', () => {
    expect(nextQuoteNumber([], 'P-')).toBe('P-0001')
  })

  it('sigue del mayor emitido, sin importar el orden de la lista', () => {
    const quotes = [{ number: 'P-0003' }, { number: 'P-0001' }, { number: 'P-0007' }]
    expect(nextQuoteNumber(quotes, 'P-')).toBe('P-0008')
  })

  it('no recicla el número de uno borrado', () => {
    const quotes = [{ number: 'P-0001' }, { number: 'P-0002' }, { number: 'P-0003' }]
    const sinElDos = quotes.filter((q) => q.number !== 'P-0002')
    expect(nextQuoteNumber(sinElDos, 'P-')).toBe('P-0004')
  })

  it('ignora los números de otro prefijo y la basura', () => {
    const quotes = [{ number: 'P-0005' }, { number: 'X-0099' }, { number: 'P-abc' }, { number: '' }]
    expect(nextQuoteNumber(quotes, 'P-')).toBe('P-0006')
    expect(parseQuoteNumber('P-', 'P-0005')).toBe(5)
    expect(parseQuoteNumber('P-', 'X-0005')).toBeNull()
    expect(parseQuoteNumber('P-', 'P-00a5')).toBeNull()
  })

  it('al cambiar el prefijo la numeración arranca de nuevo', () => {
    const quotes = [{ number: 'P-0012' }]
    expect(nextQuoteNumber(quotes, 'OBRA-')).toBe('OBRA-0001')
  })
})

/* --------------------------------- Vigencia --------------------------------- */

describe('validez', () => {
  it('suma los días de validez a la fecha', () => {
    expect(validUntil('2026-10-10', 15)).toBe('2026-10-25')
    expect(validUntil('2026-10-10', 0)).toBe('2026-10-10')
    expect(validUntil('2026-12-26', 10)).toBe('2027-01-05')
  })

  it('detecta el presupuesto vencido', () => {
    const q = quote({ date: '2026-10-01', validityDays: 10 })
    expect(isExpired(q, new Date('2026-10-05T10:00:00').getTime())).toBe(false)
    expect(isExpired(q, new Date('2026-10-11T10:00:00').getTime())).toBe(false)
    expect(isExpired(q, new Date('2026-10-12T10:00:00').getTime())).toBe(true)
  })
})

/* -------------------------- Actualización de precios -------------------------- */

describe('actualizar precios', () => {
  const catalog = (): CatalogItem[] => [
    { id: 'a', kind: 'material', name: 'Caño', unit: 'metro', price: 1_000, category: 'Materiales' },
    { id: 'b', kind: 'material', name: 'Codo', unit: 'unidad', price: 250, category: 'Materiales' },
    { id: 'c', kind: 'obra', name: 'Jornada', unit: 'jornada', price: 60_000, category: 'Mano de obra' },
    { id: 'd', kind: 'obra', name: 'Destape', unit: 'global', price: 0, category: 'Mano de obra' },
  ]

  it('sube un porcentaje a todo el catálogo', () => {
    const out = bumpPrices(catalog(), 20)
    expect(out.map((i) => i.price)).toEqual([1_200, 300, 72_000, 0])
  })

  it('toca solo la categoría elegida', () => {
    const out = bumpPrices(catalog(), 10, 'Materiales')
    expect(out.map((i) => i.price)).toEqual([1_100, 275, 60_000, 0])
  })

  it('deja en cero los ítems sin precio cargado', () => {
    expect(bumpPrices(catalog(), 50).find((i) => i.id === 'd')?.price).toBe(0)
  })

  it('acepta un porcentaje negativo para bajar precios', () => {
    expect(bumpPrices(catalog(), -10).find((i) => i.id === 'a')?.price).toBe(900)
  })

  it('redondea a dos decimales y no devuelve negativos', () => {
    const uno: CatalogItem[] = [
      { id: 'x', kind: 'material', name: 'x', unit: 'unidad', price: 333.33, category: 'c' },
    ]
    expect(bumpPrices(uno, 15)[0].price).toBe(383.33)
    expect(bumpPrices(uno, -200)[0].price).toBe(0)
  })

  it('con 0 % no cambia nada y no muta el original', () => {
    const original = catalog()
    const out = bumpPrices(original, 0)
    expect(out.map((i) => i.price)).toEqual([1_000, 250, 60_000, 0])
    expect(original[0].price).toBe(1_000)
  })

  it('lista las categorías ordenadas y sin repetir', () => {
    expect(categoriesOf(catalog())).toEqual(['Mano de obra', 'Materiales'])
  })
})

/* -------------------------------- Seguimiento -------------------------------- */

describe('seguimiento a los 3 días', () => {
  const now = new Date('2026-10-20T12:00:00').getTime()
  const sent = (daysAgo: number, status: QuoteStatus = 'enviado') =>
    quote({ status, statusAt: { enviado: now - daysAgo * DAY } })

  it('no sugiere nada antes de los 3 días', () => {
    expect(needsFollowUp(sent(0), now)).toBe(false)
    expect(needsFollowUp(sent(2), now)).toBe(false)
  })

  it('sugiere seguimiento a los 3 días justos y después', () => {
    expect(FOLLOW_UP_DAYS).toBe(3)
    expect(needsFollowUp(sent(3), now)).toBe(true)
    expect(needsFollowUp(sent(10), now)).toBe(true)
  })

  it('no sugiere nada si el cliente ya respondió', () => {
    for (const status of ['aceptado', 'rechazado', 'terminado', 'cobrado'] as QuoteStatus[]) {
      expect(needsFollowUp(sent(10, status), now)).toBe(false)
    }
  })

  it('no sugiere nada en un borrador, ni sin fecha de envío', () => {
    expect(needsFollowUp(sent(10, 'borrador'), now)).toBe(false)
    expect(needsFollowUp(quote({ status: 'enviado', statusAt: {} }), now)).toBe(false)
    expect(daysSinceSent(quote({ statusAt: {} }), now)).toBeNull()
  })

  it('cuenta los días enteros desde el envío', () => {
    expect(daysSinceSent(sent(0), now)).toBe(0)
    expect(daysSinceSent(sent(5), now)).toBe(5)
  })

  it('el umbral se puede cambiar', () => {
    expect(needsFollowUp(sent(5), now, 7)).toBe(false)
    expect(needsFollowUp(sent(5), now, 5)).toBe(true)
  })

  it('followUpQuotes junta solo los que esperan respuesta', () => {
    const lista = [
      quote({ id: 'a', status: 'enviado', statusAt: { enviado: now - 4 * DAY } }),
      quote({ id: 'b', status: 'enviado', statusAt: { enviado: now - 1 * DAY } }),
      quote({ id: 'c', status: 'aceptado', statusAt: { enviado: now - 9 * DAY } }),
      quote({ id: 'd', status: 'borrador', statusAt: {} }),
      quote({ id: 'e', status: 'enviado', statusAt: { enviado: now - 30 * DAY } }),
    ]
    expect(followUpQuotes(lista, now).map((q) => q.id)).toEqual(['a', 'e'])
  })

  it('sin presupuestos no hay nada para seguir', () => {
    expect(followUpQuotes([], now)).toEqual([])
  })

  it('el ejemplo trae un presupuesto enviado listo para seguir', () => {
    const data = sampleData(now)
    const pendientes = followUpQuotes(data.quotes, now)
    expect(pendientes).toHaveLength(1)
    expect(pendientes[0].status).toBe('enviado')
    // Enviado hace 4 días: pasa el umbral de 3 con margen visible.
    expect(daysSinceSent(pendientes[0], now)).toBe(4)
    // Y tiene teléfono del cliente, que es lo que necesita el link de WhatsApp.
    const cliente = data.clients.find((c) => c.id === pendientes[0].clientId)
    expect(cliente?.phone).toBeTruthy()
  })
})

/* --------------------------- Datos del negocio --------------------------- */

describe('datos del negocio', () => {
  it('avisa lo que falta para que el presupuesto salga presentable', () => {
    expect(businessGaps({ name: '', phone: '' })).toEqual(['el nombre', 'el WhatsApp'])
    expect(businessGaps({ name: 'Gas Soto', phone: '' })).toEqual(['el WhatsApp'])
    expect(businessGaps({ name: '', phone: '1155667788' })).toEqual(['el nombre'])
  })

  it('no se conforma con espacios en blanco', () => {
    expect(businessGaps({ name: '   ', phone: '  ' })).toEqual(['el nombre', 'el WhatsApp'])
  })

  it('con nombre y WhatsApp no falta nada', () => {
    expect(businessGaps({ name: 'Gas Soto', phone: '1155667788' })).toEqual([])
  })
})

/* ---------------------------------- Estados ---------------------------------- */

describe('estados', () => {
  it('propone el próximo paso del circuito', () => {
    expect(nextStatus('borrador')).toBe('enviado')
    expect(nextStatus('enviado')).toBe('aceptado')
    expect(nextStatus('aceptado')).toBe('terminado')
    expect(nextStatus('terminado')).toBe('cobrado')
    expect(nextStatus('cobrado')).toBeNull()
    expect(nextStatus('rechazado')).toBeNull()
  })
})

/* ------------------------------ Resumen del mes ------------------------------ */

describe('resumen del mes', () => {
  const now = new Date('2026-10-20T12:00:00').getTime()
  const withTotal = (total: number, status: QuoteStatus, date = '2026-10-05') =>
    quote({ date, status, lines: [line({ kind: 'obra', qty: 1, price: total })] })

  it('suma lo presupuestado del mes y deja afuera los borradores', () => {
    const s = monthSummary(
      [
        withTotal(100_000, 'enviado'),
        withTotal(50_000, 'aceptado'),
        withTotal(999_999, 'borrador'),
      ],
      now
    )
    expect(s.quoted).toBe(150_000)
    expect(s.sentCount).toBe(2)
  })

  it('no mezcla otros meses', () => {
    const s = monthSummary(
      [withTotal(100_000, 'enviado'), withTotal(80_000, 'enviado', '2026-09-28')],
      now
    )
    expect(s.quoted).toBe(100_000)
  })

  it('cuenta como aceptado lo aceptado, terminado y cobrado', () => {
    const s = monthSummary(
      [
        withTotal(10_000, 'aceptado'),
        withTotal(20_000, 'terminado'),
        withTotal(30_000, 'cobrado'),
        withTotal(40_000, 'rechazado'),
      ],
      now
    )
    expect(s.accepted).toBe(60_000)
    expect(s.acceptedCount).toBe(3)
  })

  it('calcula el % de aceptación sobre los que respondieron', () => {
    const s = monthSummary(
      [
        withTotal(10_000, 'aceptado'),
        withTotal(10_000, 'rechazado'),
        withTotal(10_000, 'enviado'), // sin respuesta: no entra en el %
      ],
      now
    )
    expect(s.acceptanceRate).toBe(50)
  })

  it('deja el % en null si todavía nadie respondió', () => {
    expect(monthSummary([withTotal(10_000, 'enviado')], now).acceptanceRate).toBeNull()
    expect(monthSummary([], now).acceptanceRate).toBeNull()
  })

  it('el pendiente de cobro mira todos los meses y descuenta lo cobrado', () => {
    const s = monthSummary(
      [
        withTotal(10_000, 'aceptado'),
        withTotal(20_000, 'terminado', '2026-08-01'),
        withTotal(30_000, 'cobrado'),
        withTotal(40_000, 'rechazado'),
      ],
      now
    )
    expect(s.pendingCollection).toBe(30_000)
  })
})

/* --------------------------------- Buscador --------------------------------- */

describe('buscador del catálogo', () => {
  const catalog: CatalogItem[] = [
    { id: 'a', kind: 'obra', name: 'Instalación de split', unit: 'unidad', price: 0, category: 'Instalación' },
    { id: 'b', kind: 'obra', name: 'Carga de gas', unit: 'global', price: 0, category: 'Service' },
    { id: 'c', kind: 'material', name: 'Caño de cobre', unit: 'metro', price: 0, category: 'Materiales' },
  ]

  it('busca sin tildes y sin importar mayúsculas', () => {
    expect(searchCatalog(catalog, 'INSTALACION').map((i) => i.id)).toEqual(['a'])
    expect(searchCatalog(catalog, 'caño').map((i) => i.id)).toEqual(['c'])
  })

  it('pide que aparezcan todas las palabras', () => {
    expect(searchCatalog(catalog, 'carga gas').map((i) => i.id)).toEqual(['b'])
    expect(searchCatalog(catalog, 'carga cobre')).toEqual([])
  })

  it('también busca por categoría y devuelve todo con la búsqueda vacía', () => {
    expect(searchCatalog(catalog, 'service').map((i) => i.id)).toEqual(['b'])
    expect(searchCatalog(catalog, '   ')).toHaveLength(3)
  })
})
