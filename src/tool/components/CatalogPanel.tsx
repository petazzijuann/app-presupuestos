/** HERRAMIENTA · Catálogo de ítems con precios y actualización masiva. */
import { useMemo, useState } from 'react'
import {
  Banner,
  Button,
  Card,
  Modal,
  NumberInput,
  Select,
  TextInput,
  useToast,
  cx,
} from '../../kit/ui'
import { bumpPrices, categoriesOf, searchCatalog } from '../calc'
import { uid } from '../defaults'
import { formatMoney, type CurrencyCode } from '../money'
import { KIND_LABEL, UNITS, unitShort } from '../trades'
import { Chip, Segmented } from './fields'
import type { CatalogItem, ItemKind } from '../types'

type Filter = 'todos' | ItemKind

export function CatalogPanel({
  catalog,
  currency,
  onChange,
}: {
  catalog: CatalogItem[]
  currency: CurrencyCode
  onChange: (next: CatalogItem[]) => void
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [bumpOpen, setBumpOpen] = useState(false)

  const categories = useMemo(() => categoriesOf(catalog), [catalog])
  const missingPrice = catalog.filter((i) => i.price <= 0).length

  const shown = useMemo(() => {
    const byKind = filter === 'todos' ? catalog : catalog.filter((i) => i.kind === filter)
    return searchCatalog(byKind, query)
  }, [catalog, filter, query])

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>()
    for (const item of shown) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [shown])

  const save = (item: CatalogItem) => {
    const exists = catalog.some((i) => i.id === item.id)
    onChange(exists ? catalog.map((i) => (i.id === item.id ? item : i)) : [...catalog, item])
    setEditing(null)
    toast(exists ? 'Ítem guardado.' : 'Ítem agregado al catálogo.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Catálogo</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setBumpOpen(true)} disabled={catalog.length === 0}>
            Actualizar precios
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setEditing({
                id: uid(),
                kind: 'obra',
                name: '',
                unit: 'unidad',
                price: 0,
                category: categories[0] ?? 'General',
              })
            }
          >
            + Ítem
          </Button>
        </div>
      </div>

      {catalog.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Tu catálogo está vacío. Elegí tus oficios en <strong>Mi negocio</strong> para que te
            carguemos los ítems típicos, o agregá el primero a mano.
          </p>
        </Card>
      ) : (
        <>
          {missingPrice > 0 ? (
            <Banner tone="warn">
              {missingPrice === 1
                ? 'Queda 1 ítem sin precio.'
                : `Quedan ${missingPrice} ítems sin precio.`}{' '}
              Tocá cada uno y poné tu número.
            </Banner>
          ) : null}

          <TextInput
            label="Buscar"
            type="search"
            inputMode="search"
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

          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nada con esa búsqueda.</p>
          ) : (
            grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {category}
                </h2>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {item.name || 'Sin nombre'}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {KIND_LABEL[item.kind]} · por {unitShort(item.unit)}
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
              </section>
            ))
          )}
        </>
      )}

      <ItemModal
        key={editing?.id ?? 'sin-item'}
        item={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSave={save}
        onDelete={(id) => {
          onChange(catalog.filter((i) => i.id !== id))
          setEditing(null)
          toast('Ítem borrado del catálogo.')
        }}
        canDelete={!!editing && catalog.some((i) => i.id === editing.id)}
      />

      <BumpModal
        open={bumpOpen}
        categories={categories}
        onClose={() => setBumpOpen(false)}
        onApply={(percent, category) => {
          onChange(bumpPrices(catalog, percent, category))
          setBumpOpen(false)
          const where = category ? `de ${category}` : 'del catálogo'
          toast(`Actualizamos los precios ${where} un ${percent} %.`)
        }}
      />
    </div>
  )
}

/* ------------------------------ Editor de ítem ------------------------------ */

function ItemModal({
  item,
  categories,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  item: CatalogItem | null
  categories: string[]
  canDelete: boolean
  onClose: () => void
  onSave: (item: CatalogItem) => void
  onDelete: (id: string) => void
}) {
  // El padre pasa `key={item.id}`, así que el borrador arranca limpio en cada ítem.
  const [draft, setDraft] = useState<CatalogItem | null>(item)
  const [newCategory, setNewCategory] = useState(
    item ? !categories.includes(item.category) : false
  )

  if (!item || !draft) return null

  const patch = (p: Partial<CatalogItem>) => setDraft({ ...draft, ...p })

  return (
    <Modal
      open
      onClose={onClose}
      title={canDelete ? 'Editar ítem' : 'Ítem nuevo'}
      footer={
        <>
          {canDelete ? (
            <Button variant="danger" onClick={() => onDelete(item.id)}>
              Borrar
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented<ItemKind>
          label="Tipo"
          value={draft.kind}
          onChange={(kind) => patch({ kind })}
          options={[
            { value: 'obra', label: 'Mano de obra' },
            { value: 'material', label: 'Material' },
          ]}
        />
        <TextInput
          label="Nombre"
          autoFocus
          value={draft.name}
          placeholder="Boca de luz nueva"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Unidad"
            value={draft.unit}
            onChange={(e) => patch({ unit: e.target.value as CatalogItem['unit'] })}
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </Select>
          <NumberInput
            label="Precio unitario"
            value={draft.price}
            onValue={(price) => patch({ price })}
          />
        </div>
        {newCategory || categories.length === 0 ? (
          <TextInput
            label="Categoría"
            value={draft.category}
            placeholder="Instalación"
            onChange={(e) => patch({ category: e.target.value })}
          />
        ) : (
          <Select
            label="Categoría"
            value={draft.category}
            onChange={(e) => {
              if (e.target.value === '__nueva') {
                setNewCategory(true)
                patch({ category: '' })
              } else patch({ category: e.target.value })
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__nueva">Categoría nueva…</option>
          </Select>
        )}
      </div>
    </Modal>
  )
}

/* --------------------------- Actualizar precios --------------------------- */

function BumpModal({
  open,
  categories,
  onClose,
  onApply,
}: {
  open: boolean
  categories: string[]
  onClose: () => void
  onApply: (percent: number, category?: string) => void
}) {
  const [percent, setPercent] = useState(10)
  const [category, setCategory] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Actualizar precios"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onApply(percent, category || undefined)}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Subí (o bajá, con un número negativo) todos tus precios de una vez. Los ítems que todavía
          no tienen precio quedan como están.
        </p>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30].map((p) => (
            <Chip key={p} active={percent === p} onClick={() => setPercent(p)}>
              +{p} %
            </Chip>
          ))}
        </div>
        <NumberInput
          label="Porcentaje"
          suffix="%"
          min={-100}
          value={percent}
          onValue={setPercent}
        />
        <Select
          label="Alcance"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todo el catálogo</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              Solo {c}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}
