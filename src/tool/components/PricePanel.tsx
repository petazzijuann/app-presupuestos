/** Costo, precio, canales y punto de equilibrio de un producto. */
import { Card, InfoTip, NumberInput, cx } from '../../kit/ui'
import type { ProductSummary } from '../calc'
import { marginToMarkup } from '../calc'
import { formatMoney, formatNumber, formatPercent, type CurrencyCode } from '../money'
import type { Product, Settings } from '../types'
import { CostBar } from './CostBar'

const MARGIN_TIP = (
  <>
    <strong>Margen sobre el precio</strong>: qué parte de lo que cobras es ganancia. Con un costo
    de 100 y un precio de 200, el margen es 50 %.
    <br />
    <br />
    <strong>Markup sobre el costo</strong>: cuánto le sumas al costo. En el mismo ejemplo, el
    markup es 100 %.
  </>
)

export function PricePanel({
  product,
  settings,
  summary,
  onChange,
}: {
  product: Product
  settings: Settings
  summary: ProductSummary
  onChange: (patch: Partial<Product>) => void
}) {
  const currency: CurrencyCode = settings.currency
  const { cost, price, channels, breakEven } = summary
  const loss = price.profit < 0

  return (
    <div className="space-y-4">
      <Card title="Costo unitario" subtitle="Lo que te cuesta poner una unidad en la calle.">
        <p className="mb-3 font-display text-3xl font-bold tabular-nums">
          {formatMoney(cost.total, currency)}
        </p>
        <CostBar breakdown={cost} currency={currency} />
        {settings.unitsPerMonth <= 0 ? (
          <p className="mt-3 text-xs text-warn">
            Carga cuántas unidades vendes por mes para prorratear los costos fijos.
          </p>
        ) : null}
      </Card>

      <Card
        title="Precio de venta"
        subtitle="Elige cómo lo quieres pensar: desde el margen o desde el precio."
      >
        <div
          role="group"
          aria-label="Modo de cálculo del precio"
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
        >
          {(
            [
              ['margin', 'Quiero un margen'],
              ['price', 'Tengo un precio'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              aria-pressed={product.pricingMode === mode}
              onClick={() => onChange({ pricingMode: mode })}
              className={cx(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                product.pricingMode === mode
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {product.pricingMode === 'margin' ? (
            <NumberInput
              label="Margen deseado"
              suffix="%"
              max={99}
              value={product.targetMargin}
              onValue={(targetMargin) => onChange({ targetMargin: Math.min(99, targetMargin) })}
              hint={
                <>
                  Equivale a un markup de {formatPercent(marginToMarkup(product.targetMargin), 0)}{' '}
                  sobre el costo
                  <InfoTip text={MARGIN_TIP} />
                </>
              }
            />
          ) : (
            <NumberInput
              label="Precio que quieres cobrar"
              value={product.targetPrice}
              onValue={(targetPrice) => onChange({ targetPrice })}
              hint="Te mostramos qué margen y qué ganancia te deja."
            />
          )}

          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-sm text-muted">
              {product.pricingMode === 'margin' ? 'Precio sugerido' : 'Precio elegido'}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {formatMoney(price.price, currency)}
            </p>
            <dl className="mt-2 space-y-0.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  Margen
                  <InfoTip text={MARGIN_TIP} />
                </dt>
                <dd className={cx('tabular-nums font-medium', loss && 'text-danger')}>
                  {formatPercent(price.margin)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Markup sobre el costo</dt>
                <dd className="tabular-nums font-medium">{formatPercent(price.markup)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Ganancia por unidad</dt>
                <dd className={cx('tabular-nums font-semibold', loss && 'text-danger')}>
                  {formatMoney(price.profit, currency)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {loss ? (
          <p className="mt-3 rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm">
            A ese precio estás perdiendo {formatMoney(Math.abs(price.profit), currency)} por unidad.
          </p>
        ) : null}
        {product.pricingMode === 'margin' && Number.isFinite(price.rawPrice) ? (
          <p className="mt-3 text-xs text-muted">
            Precio exacto {formatMoney(price.rawPrice, currency, { decimals: 2 })}, redondeado hacia
            arriba.
          </p>
        ) : null}
      </Card>

      <Card
        title="Canales de venta"
        subtitle="Cuánto cobrar en cada canal para que el margen no se te escape en comisiones."
      >
        {channels.length === 0 ? (
          <p className="text-sm text-muted">
            No tienes canales activos. Actívalos en Ajustes.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Canal
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Precio necesario
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Ganancia neta
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Al precio base
                  </th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.channel.id} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                      {c.channel.name || 'Canal sin nombre'}
                      <span className="block text-xs font-normal text-muted">
                        {formatPercent(c.channel.feePercent, 0)}
                        {c.channel.feeFixed > 0
                          ? ` + ${formatMoney(c.channel.feeFixed, currency)}`
                          : ''}
                      </span>
                    </th>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                      {c.achievable ? formatMoney(c.priceForMargin, currency) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {c.achievable ? formatMoney(c.profitAtChannelPrice, currency) : '—'}
                    </td>
                    <td
                      className={cx(
                        'py-2.5 text-right tabular-nums',
                        c.profitAtBasePrice < 0 && 'text-danger'
                      )}
                    >
                      {formatMoney(c.profitAtBasePrice, currency)}
                      <span className="block text-xs text-muted">
                        {formatPercent(c.marginAtBasePrice, 0)} de margen
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {channels.some((c) => !c.achievable) ? (
          <p className="mt-3 text-xs text-warn">
            En los canales marcados con “—”, la comisión es tan alta que ese margen no se puede
            alcanzar a ningún precio.
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          “Precio necesario” es lo que tienes que publicar para quedarte con el mismo margen después
          de la comisión. “Al precio base” es lo que te queda si vendes a{' '}
          {formatMoney(price.price, currency)} en ese canal.
        </p>
      </Card>

      <Card
        title="Punto de equilibrio"
        subtitle="Cuántas unidades de este producto cubren tus costos fijos del mes."
      >
        {breakEven.units === null ? (
          <p className="text-sm text-danger">
            A este precio cada venta pierde plata, así que no hay punto de equilibrio. Sube el
            precio o baja el costo.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-display text-4xl font-bold tabular-nums">
                {formatNumber(breakEven.units)}
              </p>
              <p className="text-sm text-muted">unidades por mes</p>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted">Costos fijos del mes:</dt>
                <dd className="tabular-nums font-medium">
                  {formatMoney(breakEven.fixedTotal, currency)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Cada unidad aporta:</dt>
                <dd className="tabular-nums font-medium">
                  {formatMoney(breakEven.contribution, currency)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Facturación equivalente:</dt>
                <dd className="tabular-nums font-medium">
                  {formatMoney(breakEven.revenue ?? 0, currency)}
                </dd>
              </div>
            </dl>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Cada unidad aporta el precio menos el costo variable (materiales, mano de obra y otros
          costos). Los costos fijos se cubren con ese aporte.
        </p>
      </Card>
    </div>
  )
}

export { MARGIN_TIP }
