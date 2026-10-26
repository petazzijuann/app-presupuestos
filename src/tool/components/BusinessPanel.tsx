/** HERRAMIENTA · "Mi negocio": datos, condiciones por defecto e IVA. */
import { Banner, Button, Card, NumberInput, Select, TextInput } from '../../kit/ui'
import { businessGaps } from '../calc'
import { CURRENCY_LIST } from '../money'
import { TRADES, seedCount } from '../trades'
import { Chip, Switch, Textarea } from './fields'
import { LogoPicker } from './ImagePicker'
import type { Business, TradeId } from '../types'

export function BusinessPanel({
  business,
  onPatch,
  onSyncCatalog,
  catalogCount,
  onRerunWizard,
}: {
  business: Business
  onPatch: (patch: Partial<Business>) => void
  /** Suma al catálogo los ítems de los oficios que se agregaron después. */
  onSyncCatalog: () => void
  catalogCount: number
  /** Vuelve a abrir el asistente de 3 pasos, sin borrar nada. */
  onRerunWizard: () => void
}) {
  const patchTerms = (patch: Partial<Business['terms']>) =>
    onPatch({ terms: { ...business.terms, ...patch } })

  const toggleTrade = (id: TradeId) =>
    onPatch({
      trades: business.trades.includes(id)
        ? business.trades.filter((t) => t !== id)
        : [...business.trades, id],
    })

  const pending = business.trades.reduce((acc, t) => acc + seedCount(t), 0)
  const gaps = businessGaps(business)

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Mi negocio</h1>

      {gaps.length > 0 ? (
        <Banner tone="warn">
          <span className="min-w-0 flex-1">
            Te falta {gaps.join(' y ')}. Sin eso, tus presupuestos salen incompletos.
          </span>
        </Banner>
      ) : null}

      <Card title="Datos" subtitle="Es lo que el cliente ve arriba del presupuesto.">
        <div className="space-y-4">
          <TextInput
            label="Nombre o razón social"
            value={business.name}
            placeholder="Electricidad Rivas"
            onChange={(e) => onPatch({ name: e.target.value })}
          />
          <LogoPicker logoId={business.logoId} onChange={(logoId) => onPatch({ logoId })} />
          <TextInput
            label="Teléfono / WhatsApp"
            type="tel"
            inputMode="tel"
            value={business.phone}
            placeholder="11 5566 7788"
            onChange={(e) => onPatch({ phone: e.target.value })}
            hint="Lo usamos para el pie del PDF."
          />
          <TextInput
            label="Mail"
            type="email"
            inputMode="email"
            value={business.email}
            placeholder="vos@ejemplo.com"
            onChange={(e) => onPatch({ email: e.target.value })}
          />
          <TextInput
            label="Zona de trabajo"
            value={business.area}
            placeholder="CABA y zona norte"
            onChange={(e) => onPatch({ area: e.target.value })}
          />
          <TextInput
            label="CUIT / identificación fiscal (opcional)"
            value={business.taxId}
            placeholder="20-31456789-4"
            onChange={(e) => onPatch({ taxId: e.target.value })}
          />
          <Select
            label="Moneda"
            value={business.currency}
            onChange={(e) => onPatch({ currency: e.target.value as Business['currency'] })}
          >
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card title="Oficios" subtitle="Definen qué ítems te proponemos en el catálogo.">
        <div className="grid grid-cols-2 gap-2">
          {TRADES.map((t) => (
            <Chip
              key={t.id}
              active={business.trades.includes(t.id)}
              onClick={() => toggleTrade(t.id)}
              className="justify-start text-left"
            >
              <span aria-hidden="true">{t.emoji}</span> {t.label}
            </Chip>
          ))}
        </div>
        {business.trades.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">
              Hay {pending} ítems típicos para tus oficios y {catalogCount} en tu catálogo.
            </p>
            <Chip active={false} onClick={onSyncCatalog} className="w-full justify-center">
              Agregar al catálogo los que falten
            </Chip>
          </div>
        ) : null}
      </Card>

      <Card
        title="Condiciones por defecto"
        subtitle="Se copian a cada presupuesto nuevo y las podés editar ahí."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Validez"
              suffix="días"
              value={business.terms.validityDays}
              onValue={(validityDays) => patchTerms({ validityDays })}
            />
            <NumberInput
              label="Seña"
              suffix="%"
              value={business.terms.depositPercent}
              onValue={(v) => patchTerms({ depositPercent: Math.min(100, v) })}
            />
          </div>
          <Textarea
            label="Forma de pago"
            rows={2}
            value={business.terms.payment}
            onChange={(e) => patchTerms({ payment: e.target.value })}
          />
          <Textarea
            label="Plazo de ejecución"
            rows={2}
            value={business.terms.leadTime}
            onChange={(e) => patchTerms({ leadTime: e.target.value })}
          />
          <Textarea
            label="Garantía"
            rows={2}
            value={business.terms.warranty}
            onChange={(e) => patchTerms({ warranty: e.target.value })}
          />
          <Textarea
            label="Notas al pie"
            rows={2}
            value={business.terms.footer}
            onChange={(e) => patchTerms({ footer: e.target.value })}
            hint="Va chiquito al final del PDF, debajo de las condiciones."
          />
        </div>
      </Card>

      <Card title="IVA y numeración">
        <div className="space-y-4">
          <Switch
            label="Discriminar IVA en los presupuestos"
            hint="Apagado por defecto: la mayoría de los oficios son monotributistas."
            checked={business.vat.enabled}
            onChange={(enabled) => onPatch({ vat: { ...business.vat, enabled } })}
          />
          {business.vat.enabled ? (
            <NumberInput
              label="IVA"
              suffix="%"
              value={business.vat.percent}
              onValue={(percent) => onPatch({ vat: { ...business.vat, percent } })}
            />
          ) : null}
          <TextInput
            label="Prefijo de la numeración"
            value={business.quotePrefix}
            placeholder="P-"
            onChange={(e) => onPatch({ quotePrefix: e.target.value })}
            hint={`Los presupuestos nuevos van a salir como ${business.quotePrefix || 'P-'}0001.`}
          />
          <Banner tone="info">
            Cambiar el prefijo no toca los presupuestos ya emitidos: la numeración arranca de nuevo
            con el prefijo nuevo.
          </Banner>
        </div>
      </Card>

      <Card
        title="Asistente de configuración"
        subtitle="Los tres pasos de la primera vez, por si querés repasarlos."
      >
        <Button size="lg" className="w-full" onClick={onRerunWizard}>
          Volver a ejecutar el asistente
        </Button>
        <p className="mt-2 text-xs text-muted">
          No borra nada: arranca con lo que ya tenés cargado y podés salir cuando quieras.
        </p>
      </Card>
    </div>
  )
}
