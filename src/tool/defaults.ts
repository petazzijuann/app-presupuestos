/** HERRAMIENTA · Valores iniciales, canales precargados y producto de ejemplo. */
import type { AppData, Channel, Product, Settings } from './types'

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const defaultSettings: Settings = {
  currency: 'ARS',
  fixedCosts: [
    { id: 'fc-alquiler', name: 'Alquiler', amount: 0 },
    { id: 'fc-servicios', name: 'Servicios (luz, gas, agua)', amount: 0 },
    { id: 'fc-internet', name: 'Internet y teléfono', amount: 0 },
    { id: 'fc-herramientas', name: 'Herramientas y apps', amount: 0 },
  ],
  unitsPerMonth: 100,
  hourlyRate: 0,
}

export const defaultChannels: Channel[] = [
  { id: 'ch-directo', name: 'Venta directa / transferencia', feePercent: 0, feeFixed: 0, enabled: true },
  { id: 'ch-meli', name: 'Mercado Libre', feePercent: 13, feeFixed: 0, enabled: true },
  { id: 'ch-posnet', name: 'Tarjeta / posnet', feePercent: 6, feeFixed: 0, enabled: true },
  { id: 'ch-tienda', name: 'Instagram / tienda online', feePercent: 4, feeFixed: 0, enabled: true },
]

export const emptyData = (): AppData => ({
  settings: { ...defaultSettings, fixedCosts: defaultSettings.fixedCosts.map((f) => ({ ...f })) },
  products: [],
  channels: defaultChannels.map((c) => ({ ...c })),
})

export function newProduct(name = 'Producto nuevo'): Product {
  return {
    id: uid(),
    name,
    notes: '',
    materials: [{ id: uid(), name: '', qty: 0, unit: 'g', packPrice: 0, packQty: 0 }],
    laborMinutes: 0,
    extras: [],
    pricingMode: 'margin',
    targetMargin: 50,
    targetPrice: 0,
    createdAt: Date.now(),
  }
}

/** Ejemplo cargable de un click desde el estado vacío. */
export function sampleData(): AppData {
  const base = emptyData()
  return {
    settings: {
      ...base.settings,
      unitsPerMonth: 80,
      hourlyRate: 6_000,
      fixedCosts: [
        { id: uid(), name: 'Alquiler del taller', amount: 120_000 },
        { id: uid(), name: 'Servicios (luz, gas, agua)', amount: 45_000 },
        { id: uid(), name: 'Internet y teléfono', amount: 25_000 },
        { id: uid(), name: 'Herramientas y apps', amount: 10_000 },
      ],
    },
    channels: base.channels,
    products: [
      {
        id: uid(),
        name: 'Vela de soja 200 g',
        notes: 'Vaso de vidrio reutilizable, aroma vainilla.',
        materials: [
          { id: uid(), name: 'Cera de soja', qty: 200, unit: 'g', packPrice: 12_000, packQty: 1_000 },
          { id: uid(), name: 'Esencia', qty: 12, unit: 'ml', packPrice: 9_500, packQty: 100 },
          { id: uid(), name: 'Pabilo', qty: 1, unit: 'u', packPrice: 5_000, packQty: 50 },
          { id: uid(), name: 'Vaso de vidrio', qty: 1, unit: 'u', packPrice: 24_000, packQty: 12 },
        ],
        laborMinutes: 20,
        extras: [
          { id: uid(), name: 'Packaging', amount: 900 },
          { id: uid(), name: 'Etiqueta', amount: 250 },
        ],
        pricingMode: 'margin',
        targetMargin: 55,
        targetPrice: 0,
        createdAt: Date.now(),
      },
    ],
  }
}

/** Normaliza datos viejos o importados para que nunca falte un campo. */
export function migrate(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const d = raw as Partial<AppData>
  return {
    settings: { ...base.settings, ...(d.settings ?? {}) },
    products: Array.isArray(d.products)
      ? d.products.map((p) => ({ ...newProduct(), ...p, materials: p.materials ?? [], extras: p.extras ?? [] }))
      : [],
    channels: Array.isArray(d.channels) && d.channels.length ? d.channels : base.channels,
  }
}
