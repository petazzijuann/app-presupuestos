/** HERRAMIENTA · Ficha del presupuesto: ítems, totales, condiciones y salidas. */
import { useMemo, useState } from 'react'
import { useLimits } from '../../kit/access'
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
import {
  STATUS_LABEL,
  STATUS_ORDER,
  formatDate,
  isExpired,
  isWon,
  needsFollowUp,
  nextStatus,
  quoteTotals,
  validUntil,
} from '../calc'
import { newLine } from '../defaults'
import { formatMoney } from '../money'
import { UNITS, unitShort } from '../trades'
import { Chip, Segmented, Textarea } from './fields'
import { ClientModal, emptyClient } from './ClientsPanel'
import { ItemPicker } from './ItemPicker'
import { PhotoStrip } from './ImagePicker'
import { StatusBadge } from './QuoteList'
import type {
  Business,
  CatalogItem,
  Client,
  DiscountKind,
  ItemKind,
  Quote,
  QuoteLine,
} from '../types'

export type QuoteActions = {
  onDuplicate: () => void
  onSaveTemplate: (name: string) => void
  onDelete: () => void
  onSendPdf: () => void
  onDownloadPdf: () => void
  onCopySummary: () => void
  onFollowUp: () => void
  onReceipt: () => void
  /** Guarda el ítem libre en el catálogo y devuelve el id nuevo. */
  onAddToCatalog: (line: QuoteLine) => string
}

export function QuoteEditor({
  quote,
  business,
  catalog,
  clients,
  onPatch,
  onStatus,
  onClient,
  onBack,
  actions,
  busy,
}: {
  quote: Quote
  business: Business
  catalog: CatalogItem[]
  clients: Client[]
  onPatch: (patch: Partial<Quote>) => void
  onStatus: (status: Quote['status']) => void
  /** Crea o actualiza un cliente desde acá mismo. */
  onClient: (client: Client) => void
  onBack: () => void
  actions: QuoteActions
  /** true mientras se arma un PDF (evita dobles toques). */
  busy: boolean
}) {
  const limits = useLimits()
  const toast = useToast()
  const [picker, setPicker] = useState(false)
  const [newClient, setNewClient] = useState<Client | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

  const client = clients.find((c) => c.id === quote.clientId) ?? null
  const totals = useMemo(() => quoteTotals(quote), [quote])
  const money = (n: number) => formatMoney(n, business.currency)
  const step = nextStatus(quote.status)
  const expired = isExpired(quote)

  const patchLine = (id: string, patch: Partial<QuoteLine>) =>
    onPatch({ lines: quote.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const addLine = (line: QuoteLine) => onPatch({ lines: [...quote.lines, line] })

  return (
    <div className="space-y-4">
      {/* Barra de la ficha */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Presupuestos
        </Button>
        <span className="ml-auto shrink-0">
          <StatusBadge status={quote.status} />
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-bold">{quote.number}</h1>
        <p className="text-sm text-muted">{money(totals.total)}</p>
      </div>

      {needsFollowUp(quote) ? (
        <Banner tone="warn">
          <span className="min-w-0 flex-1">Enviado hace varios días y sin respuesta.</span>
          <Button size="sm" variant="primary" onClick={actions.onFollowUp}>
            Hacer seguimiento
          </Button>
        </Banner>
      ) : null}
      {expired && !isWon(quote.status) ? (
        <Banner tone="info">
          La validez venció el {quote.validityDays} día
          {quote.validityDays === 1 ? '' : 's'} después de la fecha. Si lo vas a reenviar, duplicalo
          para que salga con precios de hoy.
        </Banner>
      ) : null}

      {/* ------------------------------ Cliente ------------------------------ */}
      <Card title="Cliente y obra">
        <div className="space-y-4">
          <div>
            <Select
              label="Cliente"
              value={quote.clientId ?? ''}
              onChange={(e) => {
                if (e.target.value === '__nuevo') setNewClient(emptyClient())
                else onPatch({ clientId: e.target.value || null })
              }}
            >
              <option value="">Sin asignar</option>
              {[...clients]
                .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              <option value="__nuevo">+ Cliente nuevo…</option>
            </Select>
            {client ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                {client.phone ? <span className="truncate">{client.phone}</span> : null}
                {client.address && !quote.address ? (
                  <Chip
                    active={false}
                    onClick={() => onPatch({ address: client.address })}
                    className="min-h-9 py-1 text-xs"
                  >
                    Usar su dirección
                  </Chip>
                ) : null}
              </div>
            ) : null}
          </div>

          <TextInput
            label="Dirección de la obra"
            value={quote.address}
            placeholder="Av. Cabildo 2340, 5.º B"
            onChange={(e) => onPatch({ address: e.target.value })}
          />
          <Textarea
            label="Descripción del trabajo"
            value={quote.description}
            placeholder="Dos bocas nuevas en la cocina y cambio de la térmica que salta."
            onChange={(e) => onPatch({ description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Fecha"
              type="date"
              value={quote.date}
              onChange={(e) => onPatch({ date: e.target.value })}
            />
            <NumberInput
              label="Validez"
              suffix="días"
              value={quote.validityDays}
              onValue={(validityDays) => onPatch({ validityDays })}
              hint={`Hasta el ${formatDate(validUntil(quote.date, quote.validityDays))}`}
            />
          </div>
        </div>
      </Card>

      {/* ------------------------------- Ítems ------------------------------- */}
      <Card
        title="Ítems"
        subtitle={quote.lines.length === 0 ? 'Buscalos en tu catálogo o cargalos libres.' : undefined}
        actions={
          <Button size="sm" variant="primary" onClick={() => setPicker(true)}>
            + Ítem
          </Button>
        }
      >
        {quote.lines.length === 0 ? (
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setPicker(true)}>
            Buscar en el catálogo
          </Button>
        ) : (
          <ul className="space-y-3">
            {quote.lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                money={money}
                inCatalog={!!line.catalogId && catalog.some((i) => i.id === line.catalogId)}
                onPatch={(patch) => patchLine(line.id, patch)}
                onRemove={() => onPatch({ lines: quote.lines.filter((l) => l.id !== line.id) })}
                onAddToCatalog={() => {
                  const catalogId = actions.onAddToCatalog(line)
                  patchLine(line.id, { catalogId })
                }}
              />
            ))}
          </ul>
        )}

        {quote.lines.length > 0 ? (
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            {totals.labor > 0 ? (
              <TotalRow label="Mano de obra" value={money(totals.labor)} />
            ) : null}
            {totals.materials > 0 ? (
              <TotalRow label="Materiales" value={money(totals.materials)} />
            ) : null}
            <TotalRow label="Subtotal" value={money(totals.subtotal)} strong />
          </dl>
        ) : null}
      </Card>

      {/* ------------------------------ Totales ------------------------------ */}
      <Card title="Descuento, IVA y seña">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Segmented<DiscountKind>
              label="Descuento"
              value={quote.discountKind}
              onChange={(discountKind) => onPatch({ discountKind })}
              options={[
                { value: 'percent', label: '%' },
                { value: 'amount', label: 'Monto' },
              ]}
            />
            <NumberInput
              label={quote.discountKind === 'percent' ? 'Descuento (%)' : 'Descuento (monto)'}
              suffix={quote.discountKind === 'percent' ? '%' : undefined}
              value={quote.discountValue}
              onValue={(discountValue) => onPatch({ discountValue })}
            />
          </div>

          <Segmented
            label="IVA"
            value={quote.vatEnabled ? 'si' : 'no'}
            onChange={(v) => onPatch({ vatEnabled: v === 'si' })}
            options={[
              { value: 'no', label: 'Sin IVA' },
              { value: 'si', label: 'Con IVA' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            {quote.vatEnabled ? (
              <NumberInput
                label="IVA"
                suffix="%"
                value={quote.vatPercent}
                onValue={(vatPercent) => onPatch({ vatPercent })}
              />
            ) : null}
            <NumberInput
              label="Seña"
              suffix="%"
              value={quote.depositPercent}
              onValue={(v) => onPatch({ depositPercent: Math.min(100, v) })}
            />
          </div>

          <dl className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <TotalRow label="Subtotal" value={money(totals.subtotal)} />
            {totals.discount > 0 ? (
              <TotalRow label="Descuento" value={`- ${money(totals.discount)}`} />
            ) : null}
            {totals.vat > 0 ? (
              <TotalRow label={`IVA ${quote.vatPercent} %`} value={money(totals.vat)} />
            ) : null}
            <TotalRow label="Total" value={money(totals.total)} strong big />
            {totals.deposit > 0 ? (
              <>
                <TotalRow label={`Seña (${quote.depositPercent} %)`} value={money(totals.deposit)} />
                <TotalRow label="Saldo contra entrega" value={money(totals.balance)} />
              </>
            ) : null}
          </dl>
        </div>
      </Card>

      {/* ---------------------------- Condiciones ---------------------------- */}
      <Card title="Condiciones" subtitle="Vienen de Mi negocio; cambialas si este trabajo es distinto.">
        <div className="space-y-4">
          <Textarea
            label="Plazo de ejecución"
            rows={2}
            value={quote.leadTime}
            onChange={(e) => onPatch({ leadTime: e.target.value })}
          />
          <Textarea
            label="Forma de pago"
            rows={2}
            value={quote.payment}
            onChange={(e) => onPatch({ payment: e.target.value })}
          />
          <Textarea
            label="Garantía"
            rows={2}
            value={quote.warranty}
            onChange={(e) => onPatch({ warranty: e.target.value })}
          />
          <Textarea
            label="Notas"
            rows={2}
            value={quote.notes}
            placeholder="Lo que haga falta aclarar."
            onChange={(e) => onPatch({ notes: e.target.value })}
          />
          <Button
            size="sm"
            onClick={() =>
              onPatch({
                leadTime: business.terms.leadTime,
                payment: business.terms.payment,
                warranty: business.terms.warranty,
                validityDays: business.terms.validityDays,
                depositPercent: business.terms.depositPercent,
              })
            }
          >
            Volver a mis condiciones
          </Button>
        </div>
      </Card>

      <Card title="Fotos">
        <PhotoStrip photoIds={quote.photoIds} onChange={(photoIds) => onPatch({ photoIds })} />
      </Card>

      {/* ------------------------------ Salidas ------------------------------ */}
      <Card title="Enviar y guardar">
        <div className="space-y-2">
          <Button
            size="lg"
            variant="primary"
            className="w-full"
            disabled={busy || quote.lines.length === 0}
            onClick={actions.onSendPdf}
          >
            {busy ? 'Armando el PDF…' : limits.canShareFile ? 'Enviar por WhatsApp' : 'Descargar PDF y abrir WhatsApp'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy || quote.lines.length === 0} onClick={actions.onDownloadPdf}>
              Descargar PDF
            </Button>
            <Button onClick={actions.onCopySummary}>Copiar resumen</Button>
          </div>
          {isWon(quote.status) ? (
            <Button className="w-full" disabled={busy} onClick={actions.onReceipt}>
              Comprobante de trabajo realizado
            </Button>
          ) : null}
          {quote.lines.length === 0 ? (
            <p className="text-xs text-muted">Cargá al menos un ítem para generar el PDF.</p>
          ) : null}
        </div>
      </Card>

      {/* ------------------------------ Estado ------------------------------ */}
      <Card title="Estado" subtitle={STATUS_LABEL[quote.status]}>
        <div className="space-y-2">
          {step ? (
            <Button
              size="lg"
              variant="primary"
              className="w-full"
              onClick={() => onStatus(step)}
            >
              Marcar como {STATUS_LABEL[step].toLowerCase()}
            </Button>
          ) : null}
          <div
            className={cx('grid gap-2', quote.status === 'enviado' && 'grid-cols-2')}
          >
            {quote.status === 'enviado' ? (
              <Button onClick={() => onStatus('rechazado')}>Marcar rechazado</Button>
            ) : null}
            <Button onClick={() => setStatusOpen(true)}>Cambiar estado…</Button>
          </div>
        </div>
      </Card>

      <Card title="Más acciones">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={actions.onDuplicate}>Duplicar presupuesto</Button>
          <Button onClick={() => setTemplateOpen(true)} disabled={quote.lines.length === 0}>
            Guardar como plantilla
          </Button>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="danger" onClick={actions.onDelete}>
            Borrar presupuesto
          </Button>
        </div>
      </Card>

      {/* ------------------------------ Modales ------------------------------ */}
      <ItemPicker
        open={picker}
        catalog={catalog}
        currency={business.currency}
        onClose={() => setPicker(false)}
        onPick={(item) => {
          addLine(
            newLine({
              kind: item.kind,
              name: item.name,
              unit: item.unit,
              qty: 1,
              price: item.price,
              catalogId: item.id,
            })
          )
          setPicker(false)
          if (item.price <= 0) toast('Ese ítem no tenía precio: cargalo acá.')
        }}
        onFree={(name) => {
          addLine(newLine({ name, kind: 'obra', unit: 'unidad' }))
          setPicker(false)
        }}
      />

      <ClientModal
        key={newClient?.id ?? 'sin-cliente-nuevo'}
        client={newClient}
        existing={false}
        usedIn={0}
        onClose={() => setNewClient(null)}
        onSave={(c) => {
          onClient(c)
          onPatch({ clientId: c.id, address: quote.address || c.address })
          setNewClient(null)
          toast('Cliente agregado.')
        }}
      />

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Cambiar estado">
        <div className="grid gap-2">
          {STATUS_ORDER.map((s) => (
            <Button
              key={s}
              size="lg"
              variant={s === quote.status ? 'primary' : 'secondary'}
              onClick={() => {
                onStatus(s)
                setStatusOpen(false)
              }}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      </Modal>

      {templateOpen ? (
        <TemplateModal
          suggestion={quote.description.split(/[.\n]/)[0]?.slice(0, 60) || quote.number}
          onClose={() => setTemplateOpen(false)}
          onSave={(name) => {
            actions.onSaveTemplate(name)
            setTemplateOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------- Subcomponentes ------------------------------- */

function TotalRow({
  label,
  value,
  strong,
  big,
}: {
  label: string
  value: string
  strong?: boolean
  big?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cx('min-w-0 truncate', strong ? 'font-semibold text-ink' : 'text-muted')}>
        {label}
      </dt>
      <dd
        className={cx(
          'shrink-0 tabular-nums',
          strong && 'font-semibold text-ink',
          big && 'font-display text-lg font-bold'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function LineRow({
  line,
  money,
  inCatalog,
  onPatch,
  onRemove,
  onAddToCatalog,
}: {
  line: QuoteLine
  money: (n: number) => string
  inCatalog: boolean
  onPatch: (patch: Partial<QuoteLine>) => void
  onRemove: () => void
  onAddToCatalog: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <input
          aria-label="Nombre del ítem"
          value={line.name}
          placeholder="Nombre del ítem"
          onChange={(e) => onPatch({ name: e.target.value })}
          className="fl-input min-w-0 flex-1 border-transparent bg-transparent px-0 py-0 font-medium"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${line.name || 'ítem'}`}
          className="shrink-0 rounded-lg px-2 py-1 text-muted hover:text-danger"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberInput
          label="Cantidad"
          value={line.qty}
          onValue={(qty) => onPatch({ qty })}
          suffix={unitShort(line.unit)}
        />
        <NumberInput
          label="Precio unitario"
          value={line.price}
          onValue={(price) => onPatch({ price })}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-lg text-xs font-medium text-brand"
        >
          {open ? 'Menos opciones' : 'Más opciones'}
        </button>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
          {money(line.qty * line.price)}
        </p>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Segmented<ItemKind>
              label="Tipo"
              value={line.kind}
              onChange={(kind) => onPatch({ kind })}
              options={[
                { value: 'obra', label: 'Obra' },
                { value: 'material', label: 'Material' },
              ]}
            />
            <Select
              label="Unidad"
              value={line.unit}
              onChange={(e) => onPatch({ unit: e.target.value as QuoteLine['unit'] })}
            >
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>
          {!inCatalog && line.name.trim() ? (
            <Button size="sm" onClick={onAddToCatalog}>
              Guardar en mi catálogo
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function TemplateModal({
  suggestion,
  onClose,
  onSave,
}: {
  suggestion: string
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(suggestion)
  return (
    <Modal
      open
      onClose={onClose}
      title="Guardar como plantilla"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>
            Guardar plantilla
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Guardamos los ítems y las condiciones (sin el cliente ni las fotos) para reusarlos en un
          toque.
        </p>
        <TextInput
          label="Nombre de la plantilla"
          autoFocus
          value={name}
          placeholder="Instalación de split estándar"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Modal>
  )
}
