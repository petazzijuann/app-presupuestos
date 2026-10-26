/** Lista de productos con su costo y su precio sugerido. */
import { Button, Card, cx } from '../../kit/ui'
import { summarize } from '../calc'
import { formatMoney, formatPercent } from '../money'
import type { AppData, Product } from '../types'

export function ProductList({
  data,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  data: AppData
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (product: Product) => void
}) {
  const { settings, channels, products } = data

  return (
    <ul className="space-y-3">
      {products.map((p) => {
        const s = summarize(p, settings, channels)
        const loss = s.price.profit < 0
        return (
          <li key={p.id}>
            <Card className="p-0">
              <button
                onClick={() => onOpen(p.id)}
                className="block w-full rounded-t-[var(--fl-radius)] p-4 text-left hover:bg-surface-2"
              >
                <p className="font-display font-semibold">{p.name || 'Producto sin nombre'}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Costo</dt>
                    <dd className="tabular-nums font-medium">
                      {formatMoney(s.cost.total, settings.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Precio</dt>
                    <dd className="tabular-nums font-semibold">
                      {formatMoney(s.price.price, settings.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Margen</dt>
                    <dd className={cx('tabular-nums font-medium', loss && 'text-danger')}>
                      {formatPercent(s.price.margin, 0)}
                    </dd>
                  </div>
                </dl>
              </button>
              <div className="flex justify-end gap-1 border-t border-line px-2 py-1.5">
                <Button variant="ghost" size="sm" onClick={() => onDuplicate(p.id)}>
                  Duplicar
                </Button>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => onDelete(p)}>
                  Borrar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onOpen(p.id)}>
                  Abrir
                </Button>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

export function EmptyState({
  onCreate,
  onLoadSample,
}: {
  onCreate: () => void
  onLoadSample: () => void
}) {
  return (
    <Card className="text-center">
      <div className="mx-auto max-w-sm py-6">
        <p className="font-display text-xl font-semibold">Empecemos por tu primer producto</p>
        <p className="mt-2 text-sm text-muted">
          Cargas tus insumos, tus minutos de trabajo y tus costos fijos, y te decimos cuánto te
          cuesta de verdad y a cuánto conviene venderlo.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={onCreate}>
            Crear mi primer producto
          </Button>
          <Button onClick={onLoadSample}>Ver un ejemplo cargado</Button>
        </div>
      </div>
    </Card>
  )
}
