/**
 * HERRAMIENTA · Buscador rápido del catálogo, desde el presupuesto.
 * Un toque agrega el ítem con su precio; si no está, se carga libre.
 */
import { useMemo, useState } from 'react'
import { Button, Modal, TextInput, cx } from '../../kit/ui'
import { searchCatalog } from '../calc'
import { formatMoney, type CurrencyCode } from '../money'
import { KIND_LABEL, unitShort } from '../trades'
import { Segmented } from './fields'
import type { CatalogItem, ItemKind } from '../types'

type Filter = 'todos' | ItemKind

export function ItemPicker({
  open,
  catalog,
  currency,
  onClose,
  onPick,
  onFree,
}: {
  open: boolean
  catalog: CatalogItem[]
  currency: CurrencyCode
  onClose: () => void
  onPick: (item: CatalogItem) => void
  /** Ítem que no está en el catálogo: se carga suelto en este presupuesto. */
  onFree: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

  const results = useMemo(() => {
    const byKind = filter === 'todos' ? catalog : catalog.filter((i) => i.kind === filter)
    return searchCatalog(byKind, query).slice(0, 60)
  }, [catalog, filter, query])

  return (
    <Modal open={open} onClose={onClose} title="Agregar ítem">
      <div className="space-y-3">
        <TextInput
          label="Buscar en tu catálogo"
          type="search"
          inputMode="search"
          autoFocus
          placeholder="boca, canilla, m² de pared…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todos', label: 'Todo' },
            { value: 'obra', label: 'Mano de obra' },
            { value: 'material', label: 'Materiales' },
          ]}
        />

        {query.trim() ? (
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => {
              onFree(query.trim())
              setQuery('')
            }}
          >
            Cargar «{query.trim()}» como ítem libre
          </Button>
        ) : null}

        {results.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            {catalog.length === 0
              ? 'Tu catálogo está vacío: cargá el ítem libre y después guardalo en el catálogo.'
              : 'Nada con esa búsqueda.'}
          </p>
        ) : (
          <ul className="max-h-[48dvh] space-y-2 overflow-y-auto pr-0.5">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {KIND_LABEL[item.kind]} · {item.category} · por {unitShort(item.unit)}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'shrink-0 text-sm font-semibold',
                      item.price > 0 ? 'text-ink' : 'text-warn'
                    )}
                  >
                    {item.price > 0 ? formatMoney(item.price, currency) : 'Sin precio'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
