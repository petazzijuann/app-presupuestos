/** HERRAMIENTA · Modelo de datos de la calculadora de costos. */
import type { CurrencyCode } from './money'

export type Material = {
  id: string
  name: string
  /** Cantidad usada por unidad producida. */
  qty: number
  /** Unidad de medida (g, ml, cm, unidades…). */
  unit: string
  /** Precio del paquete que comprás. */
  packPrice: number
  /** Cantidad que trae ese paquete, en la misma unidad. */
  packQty: number
}

export type ExtraCost = {
  id: string
  name: string
  /** Costo por unidad vendida. */
  amount: number
}

export type PricingMode = 'margin' | 'price'

export type Product = {
  id: string
  name: string
  notes: string
  materials: Material[]
  /** Minutos de trabajo por unidad. */
  laborMinutes: number
  extras: ExtraCost[]
  pricingMode: PricingMode
  /** Margen deseado sobre el precio, en % (modo A). */
  targetMargin: number
  /** Precio que quieres cobrar (modo B). */
  targetPrice: number
  createdAt: number
}

export type FixedCost = {
  id: string
  name: string
  /** Importe mensual. */
  amount: number
}

export type Settings = {
  currency: CurrencyCode
  fixedCosts: FixedCost[]
  /** Unidades que vendes por mes (estimado), para prorratear los costos fijos. */
  unitsPerMonth: number
  /** Cuánto vale tu hora de trabajo. */
  hourlyRate: number
}

export type Channel = {
  id: string
  name: string
  /** Comisión sobre el precio de venta, en %. */
  feePercent: number
  /** Costo fijo por venta (envío, costo por operación…). */
  feeFixed: number
  enabled: boolean
}

export type AppData = {
  settings: Settings
  products: Product[]
  channels: Channel[]
}
