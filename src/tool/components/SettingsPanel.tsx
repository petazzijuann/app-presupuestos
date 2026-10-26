/** Configuración general: moneda, costos fijos, unidades, valor hora y canales. */
import { Button, Card, InfoTip, NumberInput, Select, TextInput, cx } from '../../kit/ui'
import { totalFixedCosts } from '../calc'
import { CURRENCY_LIST, formatMoney, type CurrencyCode } from '../money'
import { uid } from '../defaults'
import type { AppData, Channel, FixedCost } from '../types'

export function SettingsPanel({
  data,
  update,
}: {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
}) {
  const { settings, channels } = data
  const currency = settings.currency
  const total = totalFixedCosts(settings.fixedCosts)
  const perUnit = settings.unitsPerMonth > 0 ? total / settings.unitsPerMonth : 0

  const setSettings = (patch: Partial<typeof settings>) =>
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))

  const setFixed = (id: string, patch: Partial<FixedCost>) =>
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        fixedCosts: d.settings.fixedCosts.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      },
    }))

  const setChannel = (id: string, patch: Partial<Channel>) =>
    update((d) => ({
      ...d,
      channels: d.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))

  return (
    <div className="space-y-4">
      <Card
        title="Moneda"
        subtitle="Se usa para mostrar todos los importes y para redondear los precios."
      >
        <div className="max-w-xs">
          <Select
            label="Moneda"
            value={currency}
            onChange={(e) => setSettings({ currency: e.target.value as CurrencyCode })}
          >
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card
        title="Costos fijos mensuales"
        subtitle="Lo que pagas todos los meses, vendas mucho o poco."
        actions={
          <Button
            size="sm"
            onClick={() =>
              update((d) => ({
                ...d,
                settings: {
                  ...d.settings,
                  fixedCosts: [...d.settings.fixedCosts, { id: uid(), name: '', amount: 0 }],
                },
              }))
            }
          >
            + Agregar
          </Button>
        }
      >
        <ul className="space-y-3">
          {settings.fixedCosts.map((f) => (
            <li key={f.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextInput
                  label="Concepto"
                  value={f.name}
                  placeholder="Alquiler, servicios, internet…"
                  onChange={(e) => setFixed(f.id, { name: e.target.value })}
                />
              </div>
              <div className="w-32 shrink-0 sm:w-40">
                <NumberInput
                  label="Por mes"
                  value={f.amount}
                  onValue={(amount) => setFixed(f.id, { amount })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5"
                aria-label={`Borrar ${f.name || 'costo fijo'}`}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    settings: {
                      ...d.settings,
                      fixedCosts: d.settings.fixedCosts.filter((x) => x.id !== f.id),
                    },
                  }))
                }
              >
                ✕
              </Button>
            </li>
          ))}
          {settings.fixedCosts.length === 0 ? (
            <li className="text-sm text-muted">
              Sin costos fijos cargados. Agrega al menos el alquiler o los servicios.
            </li>
          ) : null}
        </ul>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-3 text-sm">
          <div>
            <dt className="text-muted">Total por mes</dt>
            <dd className="font-display text-lg font-semibold tabular-nums">
              {formatMoney(total, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Por unidad</dt>
            <dd className="font-display text-lg font-semibold tabular-nums">
              {formatMoney(perUnit, currency)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Tu producción y tu tiempo">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Unidades que vendes por mes (estimado)"
            hint="Sirve para repartir los costos fijos entre cada unidad."
            value={settings.unitsPerMonth}
            onValue={(unitsPerMonth) => setSettings({ unitsPerMonth })}
          />
          <NumberInput
            label="Valor de tu hora de trabajo"
            hint="Cuánto vale una hora tuya. Tu trabajo también es un costo."
            value={settings.hourlyRate}
            onValue={(hourlyRate) => setSettings({ hourlyRate })}
          />
        </div>
      </Card>

      <Card
        title="Canales de venta"
        subtitle="Cada canal se queda con una parte. Ajusta las comisiones a tu caso."
        actions={
          <Button
            size="sm"
            onClick={() =>
              update((d) => ({
                ...d,
                channels: [
                  ...d.channels,
                  { id: uid(), name: '', feePercent: 0, feeFixed: 0, enabled: true },
                ],
              }))
            }
          >
            + Agregar
          </Button>
        }
      >
        <ul className="space-y-4">
          {channels.map((c) => (
            <li
              key={c.id}
              className={cx('rounded-xl border border-line p-3', !c.enabled && 'opacity-60')}
            >
              <div className="flex items-center justify-between gap-3">
                <TextInput
                  label="Canal"
                  className="max-w-full"
                  value={c.name}
                  placeholder="Nombre del canal"
                  onChange={(e) => setChannel(c.id, { name: e.target.value })}
                />
                <label className="mt-5 flex shrink-0 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--fl-brand)]"
                    checked={c.enabled}
                    onChange={(e) => setChannel(c.id, { enabled: e.target.checked })}
                  />
                  Usar
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberInput
                  label="Comisión"
                  suffix="%"
                  value={c.feePercent}
                  onValue={(feePercent) => setChannel(c.id, { feePercent })}
                />
                <NumberInput
                  label="Costo fijo por venta"
                  value={c.feeFixed}
                  onValue={(feeFixed) => setChannel(c.id, { feeFixed })}
                />
              </div>
              <div className="mt-2 text-right">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    update((d) => ({ ...d, channels: d.channels.filter((x) => x.id !== c.id) }))
                  }
                >
                  Borrar canal
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Las comisiones cambian seguido y según la categoría.
          <InfoTip text="Por ejemplo, en Mercado Libre la comisión depende de la categoría y del precio, y puede sumarse el costo de envío. Escribe el porcentaje que te cobran a ti." />
        </p>
      </Card>
    </div>
  )
}
