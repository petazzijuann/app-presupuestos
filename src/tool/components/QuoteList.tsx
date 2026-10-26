/** HERRAMIENTA · Lista de presupuestos, filtros, resumen del mes y estado vacío. */
import { useMemo, useState } from 'react'
import { Button, Card, cx } from '../../kit/ui'
import {
  STATUS_LABEL,
  STATUS_ORDER,
  daysSinceSent,
  formatDate,
  monthSummary,
  needsFollowUp,
  quoteTotals,
} from '../calc'
import { formatMoney, formatPercent, type CurrencyCode } from '../money'
import { Chip, Row, Stat } from './fields'
import type { Client, Quote, QuoteStatus, Template } from '../types'

const TONES: Record<QuoteStatus, string> = {
  borrador: 'bg-surface-2 text-muted',
  enviado: 'bg-brand-soft text-ink',
  aceptado: 'bg-ok-soft text-ok',
  rechazado: 'bg-danger-soft text-danger',
  terminado: 'bg-ok-soft text-ok',
  cobrado: 'bg-ok text-on-signal',
}

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cx(
        'inline-block shrink-0 rounded-lg px-2 py-1 text-xs font-semibold',
        TONES[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

type Filter = 'todos' | QuoteStatus

export function QuoteList({
  quotes,
  clients,
  templates,
  currency,
  onOpen,
  onFollowUp,
  onNew,
  onFromTemplate,
  onDeleteTemplate,
  atLimit,
}: {
  quotes: Quote[]
  clients: Client[]
  templates: Template[]
  currency: CurrencyCode
  onOpen: (id: string) => void
  onFollowUp: (quote: Quote) => void
  onNew: () => void
  onFromTemplate: (template: Template) => void
  onDeleteTemplate: (id: string) => void
  /** true en la demo cuando ya se llegó al tope de presupuestos. */
  atLimit: boolean
}) {
  const [filter, setFilter] = useState<Filter>('todos')
  const summary = useMemo(() => monthSummary(quotes), [quotes])
  const money = (n: number) => formatMoney(n, currency)

  const clientName = (id: string | null) =>
    clients.find((c) => c.id === id)?.name ?? 'Sin cliente'

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['todos', quotes.length]])
    for (const s of STATUS_ORDER) map.set(s, quotes.filter((q) => q.status === s).length)
    return map
  }, [quotes])

  const shown = useMemo(() => {
    const list = filter === 'todos' ? quotes : quotes.filter((q) => q.status === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [quotes, filter])

  const pendingFollowUp = useMemo(() => quotes.filter((q) => needsFollowUp(q)), [quotes])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Presupuestos</h1>
        <Button size="sm" variant="primary" onClick={onNew} disabled={atLimit}>
          + Nuevo
        </Button>
      </div>

      <Card title={`Resumen de ${MONTHS[summary.month]}`}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Presupuestado" value={money(summary.quoted)} />
          <Stat label="Aceptado" value={money(summary.accepted)} tone="ok" />
          <Stat
            label="Aceptación"
            value={summary.acceptanceRate === null ? '—' : formatPercent(summary.acceptanceRate, 0)}
            tone="brand"
          />
          <Stat
            label="Por cobrar"
            value={money(summary.pendingCollection)}
            tone={summary.pendingCollection > 0 ? 'warn' : 'ink'}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {summary.sentCount === 0
            ? 'Todavía no enviaste ninguno este mes.'
            : `${summary.sentCount} enviado${summary.sentCount === 1 ? '' : 's'} este mes, ${
                summary.acceptedCount
              } aceptado${summary.acceptedCount === 1 ? '' : 's'}.`}
        </p>
      </Card>

      {pendingFollowUp.length > 0 ? (
        <Card title="Para hacer seguimiento" subtitle="Enviados hace 3 días o más, sin respuesta.">
          <ul className="space-y-2">
            {pendingFollowUp.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-warn/40 bg-warn-soft p-3"
              >
                <span className="block min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {q.number} · {clientName(q.clientId)}
                  </span>
                  <span className="block text-xs text-muted">
                    Hace {daysSinceSent(q)} días · {money(quoteTotals(q).total)}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-2 w-full"
                  onClick={() => onFollowUp(q)}
                >
                  Hacer seguimiento
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {templates.length > 0 ? (
        <Card title="Plantillas" subtitle="Un toque y sale el presupuesto armado.">
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="min-w-0 flex-1 justify-start"
                  disabled={atLimit}
                  onClick={() => onFromTemplate(t)}
                >
                  <span className="truncate">{t.name}</span>
                </Button>
                <button
                  type="button"
                  aria-label={`Borrar la plantilla ${t.name}`}
                  onClick={() => onDeleteTemplate(t.id)}
                  className="shrink-0 rounded-lg px-2 py-2 text-muted hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Filtros: se desplazan en horizontal sin mover la página */}
      <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {(['todos', ...STATUS_ORDER] as Filter[]).map((f) => (
            <Chip
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
              className="shrink-0 whitespace-nowrap"
            >
              {f === 'todos' ? 'Todos' : STATUS_LABEL[f]} ({counts.get(f) ?? 0})
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          No hay presupuestos {filter === 'todos' ? '' : `en «${STATUS_LABEL[filter as QuoteStatus]}»`}.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((q) => {
            const total = quoteTotals(q).total
            return (
              <li key={q.id}>
                <Row onClick={() => onOpen(q.id)}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className="shrink-0">{q.number}</span>
                        <span className="truncate font-normal text-muted">
                          {clientName(q.clientId)}
                        </span>
                      </p>
                      {q.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted">{q.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted">{formatDate(q.date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold tabular-nums">{money(total)}</p>
                      <p className="mt-1">
                        <StatusBadge status={q.status} />
                      </p>
                      {needsFollowUp(q) ? (
                        <p className="mt-1 text-[11px] font-semibold text-warn">Sin respuesta</p>
                      ) : null}
                    </div>
                  </div>
                </Row>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------ Estado vacío ------------------------------ */

export function EmptyState({
  onNew,
  onLoadSample,
  canSample,
}: {
  onNew: () => void
  onLoadSample: () => void
  canSample: boolean
}) {
  return (
    <Card>
      <div className="py-2 text-center">
        <p className="text-4xl" aria-hidden="true">
          📄
        </p>
        <h2 className="mt-3 font-display text-lg font-bold">Tu primer presupuesto</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Elegís el cliente, tocás los ítems de tu catálogo y sale el PDF listo para mandar por
          WhatsApp.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button size="lg" variant="primary" onClick={onNew}>
            Hacer un presupuesto
          </Button>
          {canSample ? (
            <Button size="lg" onClick={onLoadSample}>
              Cargar ejemplo
            </Button>
          ) : null}
        </div>
        {canSample ? (
          <p className="mt-3 text-xs text-muted">
            El ejemplo es un electricista con 3 clientes y 4 presupuestos, para mirar cómo queda.
          </p>
        ) : null}
      </div>
    </Card>
  )
}
