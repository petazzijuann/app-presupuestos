/**
 * HERRAMIENTA · Toda la matemática vive acá, en funciones puras y testeadas.
 * Ningún componente de React hace cuentas por su cuenta.
 */
import { roundUpPrice, type CurrencyCode } from './money'
import type { Channel, ExtraCost, FixedCost, Material, Product, Settings } from './types'

const num = (n: number) => (Number.isFinite(n) ? n : 0)
const positive = (n: number) => Math.max(0, num(n))

/* ----------------------------- Costo unitario ----------------------------- */

/** Costo proporcional de un insumo: lo que cuesta la cantidad que usás. */
export function materialUnitCost(m: Pick<Material, 'qty' | 'packPrice' | 'packQty'>): number {
  const packQty = num(m.packQty)
  if (packQty <= 0) return 0
  return (positive(m.qty) / packQty) * positive(m.packPrice)
}

export function materialsCost(materials: Material[]): number {
  return materials.reduce((acc, m) => acc + materialUnitCost(m), 0)
}

/** Mano de obra: minutos por unidad valorizados con tu valor hora. */
export function laborCost(laborMinutes: number, hourlyRate: number): number {
  return (positive(laborMinutes) / 60) * positive(hourlyRate)
}

export function extrasCost(extras: ExtraCost[]): number {
  return extras.reduce((acc, e) => acc + positive(e.amount), 0)
}

export function totalFixedCosts(fixedCosts: FixedCost[]): number {
  return fixedCosts.reduce((acc, f) => acc + positive(f.amount), 0)
}

/** Parte de los costos fijos que le toca a cada unidad vendida. */
export function fixedCostPerUnit(fixedCosts: FixedCost[], unitsPerMonth: number): number {
  const units = positive(unitsPerMonth)
  if (units <= 0) return 0
  return totalFixedCosts(fixedCosts) / units
}

export type CostBreakdown = {
  materials: number
  labor: number
  extras: number
  fixed: number
  /** Costo que depende de producir una unidad más (sin costos fijos). */
  variable: number
  /** Costo unitario total. */
  total: number
}

export function costBreakdown(product: Product, settings: Settings): CostBreakdown {
  const materials = materialsCost(product.materials)
  const labor = laborCost(product.laborMinutes, settings.hourlyRate)
  const extras = extrasCost(product.extras)
  const fixed = fixedCostPerUnit(settings.fixedCosts, settings.unitsPerMonth)
  const variable = materials + labor + extras
  return { materials, labor, extras, fixed, variable, total: variable + fixed }
}

/** Porcentaje que representa cada rubro sobre el costo total (para el desglose visual). */
export function costShares(b: CostBreakdown) {
  const t = b.total
  const pct = (v: number) => (t > 0 ? (v / t) * 100 : 0)
  return {
    materials: pct(b.materials),
    labor: pct(b.labor),
    extras: pct(b.extras),
    fixed: pct(b.fixed),
  }
}

/* --------------------------- Margen y markup --------------------------- */

/**
 * Modo A: del margen deseado (sobre el PRECIO) al precio sugerido.
 * precio = costo / (1 - margen)
 */
export function priceFromMargin(cost: number, marginPercent: number): number {
  const m = num(marginPercent) / 100
  if (m >= 1) return Infinity // 100 % de margen es imposible
  return positive(cost) / (1 - m)
}

/** Modo B: del precio al margen sobre el precio, en %. */
export function marginFromPrice(cost: number, price: number): number {
  const p = num(price)
  if (p <= 0) return 0
  return ((p - positive(cost)) / p) * 100
}

/** Markup: cuánto le sumás al COSTO, en %. */
export function markupFromPrice(cost: number, price: number): number {
  const c = positive(cost)
  if (c <= 0) return 0
  return ((num(price) - c) / c) * 100
}

/** Equivalencia entre las dos formas de hablar de la ganancia. */
export const marginToMarkup = (marginPercent: number): number => {
  const m = num(marginPercent) / 100
  if (m >= 1) return Infinity
  return (m / (1 - m)) * 100
}
export const markupToMargin = (markupPercent: number): number => {
  const k = num(markupPercent) / 100
  if (1 + k <= 0) return 0
  return (k / (1 + k)) * 100
}

export const profitPerUnit = (cost: number, price: number): number => num(price) - positive(cost)

/* ---------------------------- Precio del producto ---------------------------- */

export type PriceResult = {
  /** Precio antes de redondear. */
  rawPrice: number
  /** Precio redondeado hacia arriba según la moneda. */
  price: number
  margin: number
  markup: number
  profit: number
}

/** Resuelve el precio del producto según el modo elegido (margen o precio fijo). */
export function resolvePrice(
  product: Pick<Product, 'pricingMode' | 'targetMargin' | 'targetPrice'>,
  cost: number,
  currency: CurrencyCode
): PriceResult {
  const raw =
    product.pricingMode === 'margin'
      ? priceFromMargin(cost, product.targetMargin)
      : positive(product.targetPrice)
  const price =
    product.pricingMode === 'margin' && Number.isFinite(raw) ? roundUpPrice(raw, currency) : raw
  return {
    rawPrice: raw,
    price,
    margin: marginFromPrice(cost, price),
    markup: markupFromPrice(cost, price),
    profit: profitPerUnit(cost, price),
  }
}

/* ------------------------------ Canales ------------------------------ */

export type ChannelResult = {
  channel: Channel
  /** Precio a publicar en ese canal para sostener el margen objetivo. */
  priceForMargin: number
  /** Lo que te queda en el bolsillo si vendes a `priceForMargin`. */
  profitAtChannelPrice: number
  /** Comisión + costo fijo que te cobra el canal a ese precio. */
  feeAtChannelPrice: number
  /** Ganancia neta si vendes al precio base (sin subirlo). */
  profitAtBasePrice: number
  /** Margen neto resultante si vendes al precio base, en %. */
  marginAtBasePrice: number
  /** false si la comisión hace imposible alcanzar ese margen. */
  achievable: boolean
}

export const channelFee = (channel: Channel, price: number): number =>
  positive(price) * (positive(channel.feePercent) / 100) + positive(channel.feeFixed)

/** Lo que te queda neto por unidad vendiendo a `price` en ese canal. */
export function channelNetProfit(channel: Channel, price: number, cost: number): number {
  return num(price) - channelFee(channel, price) - positive(cost)
}

/**
 * Precio necesario en un canal para conservar el margen objetivo:
 *   p - p·comisión - fijo - costo = margen · p   →   p = (costo + fijo) / (1 - comisión - margen)
 */
export function channelPriceForMargin(
  channel: Channel,
  cost: number,
  marginPercent: number
): number {
  const f = positive(channel.feePercent) / 100
  const m = num(marginPercent) / 100
  const denom = 1 - f - m
  if (denom <= 0) return Infinity
  return (positive(cost) + positive(channel.feeFixed)) / denom
}

export function channelResult(
  channel: Channel,
  cost: number,
  basePrice: number,
  marginPercent: number,
  currency: CurrencyCode
): ChannelResult {
  const raw = channelPriceForMargin(channel, cost, marginPercent)
  const priceForMargin = Number.isFinite(raw) ? roundUpPrice(raw, currency) : Infinity
  return {
    channel,
    priceForMargin,
    profitAtChannelPrice: Number.isFinite(priceForMargin)
      ? channelNetProfit(channel, priceForMargin, cost)
      : NaN,
    feeAtChannelPrice: Number.isFinite(priceForMargin) ? channelFee(channel, priceForMargin) : NaN,
    profitAtBasePrice: channelNetProfit(channel, basePrice, cost),
    marginAtBasePrice:
      basePrice > 0 ? (channelNetProfit(channel, basePrice, cost) / basePrice) * 100 : 0,
    achievable: Number.isFinite(raw),
  }
}

/* --------------------------- Punto de equilibrio --------------------------- */

export type BreakEven = {
  /** Lo que deja cada unidad para pagar los costos fijos. */
  contribution: number
  /** Unidades por mes necesarias. Null si el producto no deja ganancia. */
  units: number | null
  /** Facturación mensual equivalente. */
  revenue: number | null
  fixedTotal: number
}

/** Cuántas unidades por mes hay que vender para cubrir los costos fijos. */
export function breakEven(
  settings: Settings,
  variableCost: number,
  price: number
): BreakEven {
  const fixedTotal = totalFixedCosts(settings.fixedCosts)
  const contribution = num(price) - positive(variableCost)
  if (contribution <= 0) return { contribution, units: null, revenue: null, fixedTotal }
  const units = Math.ceil(fixedTotal / contribution)
  return { contribution, units, revenue: units * num(price), fixedTotal }
}

/* ------------------------------ Resumen ------------------------------ */

export type ProductSummary = {
  cost: CostBreakdown
  shares: ReturnType<typeof costShares>
  price: PriceResult
  channels: ChannelResult[]
  breakEven: BreakEven
}

/** Un único cálculo por producto: lo que consume toda la interfaz. */
export function summarize(
  product: Product,
  settings: Settings,
  channels: Channel[]
): ProductSummary {
  const cost = costBreakdown(product, settings)
  const price = resolvePrice(product, cost.total, settings.currency)
  const margin = price.margin
  return {
    cost,
    shares: costShares(cost),
    price,
    channels: channels
      .filter((c) => c.enabled)
      .map((c) => channelResult(c, cost.total, price.price, margin, settings.currency)),
    breakEven: breakEven(settings, cost.variable, price.price),
  }
}
