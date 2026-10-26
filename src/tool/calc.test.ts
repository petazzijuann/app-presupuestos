import { describe, expect, it } from 'vitest'
import {
  breakEven,
  channelNetProfit,
  channelPriceForMargin,
  costBreakdown,
  costShares,
  fixedCostPerUnit,
  laborCost,
  marginFromPrice,
  marginToMarkup,
  markupFromPrice,
  markupToMargin,
  materialUnitCost,
  materialsCost,
  priceFromMargin,
  resolvePrice,
  summarize,
} from './calc'
import { formatMoney, roundUpPrice } from './money'
import type { Channel, Product, Settings } from './types'

const settings: Settings = {
  currency: 'ARS',
  fixedCosts: [
    { id: 'f1', name: 'Alquiler', amount: 100_000 },
    { id: 'f2', name: 'Internet', amount: 20_000 },
  ],
  unitsPerMonth: 100,
  hourlyRate: 6_000,
}

const product: Product = {
  id: 'p1',
  name: 'Vela de soja 200 g',
  notes: '',
  materials: [
    // 1 kg de cera a $12.000 -> 200 g cuestan $2.400
    { id: 'm1', name: 'Cera', qty: 200, unit: 'g', packPrice: 12_000, packQty: 1_000 },
    // 1 pabilo de un paquete de 50 a $5.000 -> $100
    { id: 'm2', name: 'Pabilo', qty: 1, unit: 'u', packPrice: 5_000, packQty: 50 },
  ],
  laborMinutes: 20,
  extras: [{ id: 'e1', name: 'Packaging', amount: 500 }],
  pricingMode: 'margin',
  targetMargin: 50,
  targetPrice: 0,
  createdAt: 0,
}

describe('costo de materiales', () => {
  it('prorratea el precio del paquete según la cantidad usada', () => {
    expect(materialUnitCost({ qty: 200, packPrice: 12_000, packQty: 1_000 })).toBe(2_400)
    expect(materialUnitCost({ qty: 1, packPrice: 5_000, packQty: 50 })).toBe(100)
  })

  it('no explota si el paquete trae 0 o falta el dato', () => {
    expect(materialUnitCost({ qty: 5, packPrice: 1_000, packQty: 0 })).toBe(0)
    expect(materialUnitCost({ qty: NaN, packPrice: 1_000, packQty: 10 })).toBe(0)
  })

  it('suma todos los insumos', () => {
    expect(materialsCost(product.materials)).toBe(2_500)
  })
})

describe('mano de obra y costos fijos', () => {
  it('valoriza los minutos con el valor hora', () => {
    expect(laborCost(20, 6_000)).toBe(2_000)
    expect(laborCost(90, 6_000)).toBe(9_000)
  })

  it('prorratea los costos fijos entre las unidades del mes', () => {
    expect(fixedCostPerUnit(settings.fixedCosts, 100)).toBe(1_200)
  })

  it('devuelve 0 si todavía no estimaste unidades (evita dividir por cero)', () => {
    expect(fixedCostPerUnit(settings.fixedCosts, 0)).toBe(0)
  })
})

describe('costo unitario', () => {
  const b = costBreakdown(product, settings)

  it('suma materiales + mano de obra + otros + fijos', () => {
    expect(b).toMatchObject({ materials: 2_500, labor: 2_000, extras: 500, fixed: 1_200 })
    expect(b.variable).toBe(5_000)
    expect(b.total).toBe(6_200)
  })

  it('reparte el 100 % entre los rubros', () => {
    const s = costShares(b)
    expect(s.materials + s.labor + s.extras + s.fixed).toBeCloseTo(100, 10)
  })
})

describe('margen y markup', () => {
  it('modo A: del margen al precio', () => {
    expect(priceFromMargin(6_200, 50)).toBe(12_400)
    expect(priceFromMargin(100, 0)).toBe(100)
    expect(priceFromMargin(100, 100)).toBe(Infinity)
  })

  it('modo B: del precio al margen y al markup', () => {
    expect(marginFromPrice(6_200, 12_400)).toBe(50)
    expect(markupFromPrice(6_200, 12_400)).toBe(100)
  })

  it('margen y markup son la misma ganancia contada distinto', () => {
    expect(marginToMarkup(50)).toBeCloseTo(100)
    expect(markupToMargin(100)).toBeCloseTo(50)
    expect(markupToMargin(marginToMarkup(33))).toBeCloseTo(33)
  })

  it('un precio por debajo del costo da margen negativo', () => {
    expect(marginFromPrice(1_000, 800)).toBeCloseTo(-25)
  })
})

describe('redondeo por moneda', () => {
  it('redondea hacia arriba al paso de cada moneda', () => {
    expect(roundUpPrice(12_401, 'ARS')).toBe(12_500)
    expect(roundUpPrice(12_400, 'ARS')).toBe(12_400)
    expect(roundUpPrice(19.01, 'USD')).toBe(19.5)
    expect(roundUpPrice(1_001, 'COP')).toBe(1_500)
    expect(roundUpPrice(10.2, 'MXN')).toBe(11)
  })

  it('no empuja un valor exacto al escalón siguiente', () => {
    expect(roundUpPrice(0.3 + 0.2, 'USD')).toBe(0.5)
  })

  it('formatea con la convención de cada país', () => {
    expect(formatMoney(12_400, 'ARS')).toContain('12.400')
    expect(formatMoney(19.5, 'USD')).toBe('$19.50')
  })
})

describe('canales de venta', () => {
  const ml: Channel = {
    id: 'c1',
    name: 'Mercado Libre',
    feePercent: 13,
    feeFixed: 1_000,
    enabled: true,
  }
  const directo: Channel = {
    id: 'c0',
    name: 'Venta directa',
    feePercent: 0,
    feeFixed: 0,
    enabled: true,
  }

  it('sin comisión, el precio del canal es el precio base', () => {
    expect(channelPriceForMargin(directo, 6_200, 50)).toBe(12_400)
  })

  it('sube el precio para absorber comisión y costo fijo', () => {
    // (6200 + 1000) / (1 - 0.13 - 0.50) = 19459,45...
    expect(channelPriceForMargin(ml, 6_200, 50)).toBeCloseTo(19_459.46, 2)
  })

  it('al precio del canal, el margen objetivo se cumple', () => {
    const p = channelPriceForMargin(ml, 6_200, 50)
    expect(channelNetProfit(ml, p, 6_200) / p).toBeCloseTo(0.5, 10)
  })

  it('avisa cuando la comisión hace imposible el margen', () => {
    expect(channelPriceForMargin(ml, 6_200, 90)).toBe(Infinity)
  })

  it('calcula la ganancia neta a un precio dado', () => {
    // 12.400 - 13 % - 1.000 - 6.200 = 3.588
    expect(channelNetProfit(ml, 12_400, 6_200)).toBeCloseTo(3_588, 10)
  })
})

describe('punto de equilibrio', () => {
  it('usa el costo variable, no el total (los fijos son lo que hay que cubrir)', () => {
    const r = breakEven(settings, 5_000, 12_400)
    expect(r.contribution).toBe(7_400)
    expect(r.fixedTotal).toBe(120_000)
    expect(r.units).toBe(17) // 120.000 / 7.400 = 16,2 -> 17
    expect(r.revenue).toBe(17 * 12_400)
  })

  it('no hay punto de equilibrio si cada venta pierde plata', () => {
    expect(breakEven(settings, 5_000, 4_000).units).toBeNull()
  })
})

describe('resumen completo del producto', () => {
  const channels: Channel[] = [
    { id: 'c0', name: 'Venta directa', feePercent: 0, feeFixed: 0, enabled: true },
    { id: 'c1', name: 'Mercado Libre', feePercent: 13, feeFixed: 1_000, enabled: true },
    { id: 'c2', name: 'Apagado', feePercent: 5, feeFixed: 0, enabled: false },
  ]

  it('modo margen: precio sugerido redondeado y ganancia coherente', () => {
    const s = summarize(product, settings, channels)
    expect(s.cost.total).toBe(6_200)
    expect(s.price.price).toBe(12_400)
    expect(s.price.profit).toBe(6_200)
    expect(s.channels).toHaveLength(2) // el canal apagado no aparece
    expect(s.breakEven.units).toBe(17)
  })

  it('modo precio: respeta el precio escrito y deriva el margen', () => {
    const s = summarize({ ...product, pricingMode: 'price', targetPrice: 10_000 }, settings, channels)
    expect(s.price.price).toBe(10_000)
    expect(s.price.margin).toBeCloseTo(38, 0)
    expect(s.price.profit).toBe(3_800)
  })

  it('modo margen con precio redondeado hacia arriba', () => {
    const r = resolvePrice({ pricingMode: 'margin', targetMargin: 55, targetPrice: 0 }, 6_200, 'ARS')
    expect(r.rawPrice).toBeCloseTo(13_777.78, 2)
    expect(r.price).toBe(13_800)
    expect(r.margin).toBeGreaterThan(55)
  })

  it('un producto vacío no rompe nada', () => {
    const empty: Product = { ...product, materials: [], extras: [], laborMinutes: 0 }
    const s = summarize(empty, { ...settings, fixedCosts: [] }, [])
    expect(s.cost.total).toBe(0)
    expect(s.price.price).toBe(0)
    expect(s.breakEven.units).toBeNull()
  })
})
