/** Edición de un producto: insumos, mano de obra y otros costos. */
import { Button, Card, InfoTip, NumberInput, TextInput } from '../../kit/ui'
import { laborCost, materialUnitCost } from '../calc'
import { formatCost, formatMoney } from '../money'
import { uid } from '../defaults'
import type { ExtraCost, Material, Product, Settings } from '../types'

const UNITS = ['g', 'kg', 'ml', 'l', 'cm', 'm', 'u']

export function ProductEditor({
  product,
  settings,
  onChange,
  onOpenSettings,
}: {
  product: Product
  settings: Settings
  onChange: (patch: Partial<Product>) => void
  onOpenSettings: () => void
}) {
  const currency = settings.currency

  const setMaterial = (id: string, patch: Partial<Material>) =>
    onChange({
      materials: product.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })
  const setExtra = (id: string, patch: Partial<ExtraCost>) =>
    onChange({ extras: product.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) })

  return (
    <div className="space-y-4">
      <Card title="Producto">
        <div className="space-y-4">
          <TextInput
            label="Nombre"
            value={product.name}
            placeholder="Vela de soja 200 g"
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <TextInput
            label="Notas (opcional)"
            value={product.notes}
            placeholder="Medidas, variantes, detalles…"
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </Card>

      <Card
        title="Materiales e insumos"
        subtitle="Carga el precio del paquete y cuánto usas por unidad: el costo proporcional lo calculamos nosotros."
        actions={
          <Button
            size="sm"
            onClick={() =>
              onChange({
                materials: [
                  ...product.materials,
                  { id: uid(), name: '', qty: 0, unit: 'g', packPrice: 0, packQty: 0 },
                ],
              })
            }
          >
            + Agregar
          </Button>
        }
      >
        <ul className="space-y-3">
          {product.materials.map((m) => (
            <li key={m.id} className="rounded-xl border border-line p-3">
              <TextInput
                label="Insumo"
                value={m.name}
                placeholder="Cera de soja"
                onChange={(e) => setMaterial(m.id, { name: e.target.value })}
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberInput
                  label="Cantidad que usas"
                  value={m.qty}
                  onValue={(qty) => setMaterial(m.id, { qty })}
                />
                <div>
                  <label className="fl-label" htmlFor={`unit-${m.id}`}>
                    Unidad
                  </label>
                  <input
                    id={`unit-${m.id}`}
                    list="fl-unidades"
                    className="fl-input"
                    value={m.unit}
                    onChange={(e) => setMaterial(m.id, { unit: e.target.value })}
                  />
                </div>
                <NumberInput
                  label="Precio del paquete"
                  value={m.packPrice}
                  onValue={(packPrice) => setMaterial(m.id, { packPrice })}
                />
                <NumberInput
                  label={`Cantidad del paquete${m.unit ? ` (${m.unit})` : ''}`}
                  value={m.packQty}
                  onValue={(packQty) => setMaterial(m.id, { packQty })}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2">
                <p className="text-sm text-muted">
                  Costo por unidad:{' '}
                  <strong className="tabular-nums text-ink">
                    {formatCost(materialUnitCost(m), currency)}
                  </strong>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Borrar ${m.name || 'insumo'}`}
                  onClick={() =>
                    onChange({ materials: product.materials.filter((x) => x.id !== m.id) })
                  }
                >
                  Borrar
                </Button>
              </div>
            </li>
          ))}
          {product.materials.length === 0 ? (
            <li className="text-sm text-muted">Todavía no cargaste insumos.</li>
          ) : null}
        </ul>
        <datalist id="fl-unidades">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Card>

      <Card title="Mano de obra">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Minutos por unidad"
            suffix="min"
            value={product.laborMinutes}
            onValue={(laborMinutes) => onChange({ laborMinutes })}
          />
          <div className="self-end rounded-xl bg-surface-2 p-3 text-sm">
            <p className="text-muted">
              Tu hora vale{' '}
              <strong className="text-ink">{formatMoney(settings.hourlyRate, currency)}</strong>
              <InfoTip text="El valor de tu hora se configura una sola vez en Ajustes y se usa en todos los productos." />
            </p>
            <p className="mt-1">
              Costo de mano de obra:{' '}
              <strong className="tabular-nums">
                {formatCost(laborCost(product.laborMinutes, settings.hourlyRate), currency)}
              </strong>
            </p>
            <button
              className="mt-1 text-xs text-brand underline underline-offset-2"
              onClick={onOpenSettings}
            >
              Cambiar valor hora
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="Otros costos por unidad"
        subtitle="Packaging, envío, etiquetas: todo lo que gastas por cada unidad vendida."
        actions={
          <Button
            size="sm"
            onClick={() =>
              onChange({ extras: [...product.extras, { id: uid(), name: '', amount: 0 }] })
            }
          >
            + Agregar
          </Button>
        }
      >
        <ul className="space-y-3">
          {product.extras.map((e) => (
            <li key={e.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextInput
                  label="Concepto"
                  value={e.name}
                  placeholder="Packaging, etiqueta, envío…"
                  onChange={(ev) => setExtra(e.id, { name: ev.target.value })}
                />
              </div>
              <div className="w-32 shrink-0 sm:w-40">
                <NumberInput
                  label="Por unidad"
                  value={e.amount}
                  onValue={(amount) => setExtra(e.id, { amount })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5"
                aria-label={`Borrar ${e.name || 'costo'}`}
                onClick={() => onChange({ extras: product.extras.filter((x) => x.id !== e.id) })}
              >
                ✕
              </Button>
            </li>
          ))}
          {product.extras.length === 0 ? (
            <li className="text-sm text-muted">
              Sin otros costos. Agrega el packaging o el envío si los pagas tú.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  )
}
