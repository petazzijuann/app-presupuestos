/** Ficha del producto para imprimir o guardar como PDF (window.print). */
import { config } from '../../config'
import type { ProductSummary } from '../calc'
import { materialUnitCost } from '../calc'
import { formatCost, formatMoney, formatNumber, formatPercent } from '../money'
import type { Product, Settings } from '../types'

export function ProductSheet({
  product,
  settings,
  summary,
}: {
  product: Product
  settings: Settings
  summary: ProductSummary
}) {
  const c = settings.currency
  const { cost, price, channels, breakEven } = summary
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article className="print-sheet mx-auto max-w-3xl p-6 text-[12px] leading-snug text-black">
      <header className="mb-5 flex items-start justify-between border-b border-black/20 pb-3">
        <div>
          <h1 className="text-xl font-bold">{product.name || 'Producto sin nombre'}</h1>
          {product.notes ? <p className="mt-1 text-black/70">{product.notes}</p> : null}
        </div>
        <div className="text-right text-[11px] text-black/60">
          <p className="font-semibold">
            {config.appName} · {config.brand}
          </p>
          <p>{today}</p>
        </div>
      </header>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Materiales e insumos</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-1">Insumo</th>
              <th className="py-1">Cantidad</th>
              <th className="py-1 text-right">Paquete</th>
              <th className="py-1 text-right">Costo por unidad</th>
            </tr>
          </thead>
          <tbody>
            {product.materials.map((m) => (
              <tr key={m.id} className="border-b border-black/10">
                <td className="py-1">{m.name || '—'}</td>
                <td className="py-1">
                  {formatNumber(m.qty)} {m.unit}
                </td>
                <td className="py-1 text-right">
                  {formatMoney(m.packPrice, c)} / {formatNumber(m.packQty)} {m.unit}
                </td>
                <td className="py-1 text-right">{formatCost(materialUnitCost(m), c)}</td>
              </tr>
            ))}
            {product.materials.length === 0 ? (
              <tr>
                <td className="py-1 text-black/60" colSpan={4}>
                  Sin insumos cargados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Costo unitario</h2>
          <dl className="space-y-1">
            <Row label="Materiales" value={formatCost(cost.materials, c)} />
            <Row
              label={`Mano de obra (${formatNumber(product.laborMinutes)} min)`}
              value={formatCost(cost.labor, c)}
            />
            <Row label="Otros costos" value={formatCost(cost.extras, c)} />
            <Row label="Costos fijos prorrateados" value={formatCost(cost.fixed, c)} />
            <div className="flex justify-between border-t border-black/30 pt-1 font-bold">
              <dt>Total</dt>
              <dd>{formatMoney(cost.total, c)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Precio</h2>
          <dl className="space-y-1">
            <Row label="Precio de venta" value={formatMoney(price.price, c)} />
            <Row label="Margen sobre el precio" value={formatPercent(price.margin)} />
            <Row label="Markup sobre el costo" value={formatPercent(price.markup)} />
            <Row label="Ganancia por unidad" value={formatMoney(price.profit, c)} />
            <Row
              label="Punto de equilibrio"
              value={breakEven.units === null ? '—' : `${formatNumber(breakEven.units)} u/mes`}
            />
          </dl>
        </div>
      </section>

      {product.extras.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Otros costos</h2>
          <dl className="grid grid-cols-2 gap-x-6">
            {product.extras.map((e) => (
              <Row key={e.id} label={e.name || '—'} value={formatCost(e.amount, c)} />
            ))}
          </dl>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Canales de venta</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-1">Canal</th>
              <th className="py-1 text-right">Comisión</th>
              <th className="py-1 text-right">Precio necesario</th>
              <th className="py-1 text-right">Ganancia neta</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => (
              <tr key={ch.channel.id} className="border-b border-black/10">
                <td className="py-1">{ch.channel.name}</td>
                <td className="py-1 text-right">
                  {formatPercent(ch.channel.feePercent, 0)}
                  {ch.channel.feeFixed > 0 ? ` + ${formatMoney(ch.channel.feeFixed, c)}` : ''}
                </td>
                <td className="py-1 text-right">
                  {ch.achievable ? formatMoney(ch.priceForMargin, c) : '—'}
                </td>
                <td className="py-1 text-right">
                  {ch.achievable ? formatMoney(ch.profitAtChannelPrice, c) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-6 border-t border-black/20 pt-2 text-[10px] text-black/60">
        Calculado con {config.appName} de {config.brand} · {config.landingUrl}
      </footer>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/70">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
