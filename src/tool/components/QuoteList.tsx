/** HERRAMIENTA · Lista de presupuestos, filtros, resumen del mes y estado vacío. */
import { useMemo, useState } from 'react'
import { Banner, Button, Card, cx } from '../../kit/ui'
import {
  STATUS_LABEL,
  STATUS_ORDER,
  daysSinceSent,
  followUpQuotes,
  formatDate,
  monthSummary,
  needsFollowUp,
  quoteTotals,
} from '../calc'
import { formatMoney, formatPercent, type CurrencyCode } from '../money'
import { Chip, Stat } from './fields'
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

type Filter = 'todos' | 'seguir' | QuoteStatus

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

  const pendingFollowUp = useMemo(() => followUpQuotes(quotes), [quotes])

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([
      ['todos', quotes.length],
      ['seguir', pendingFollowUp.length],
    ])
    for (const s of STATUS_ORDER) map.set(s, quotes.filter((q) => q.status === s).length)
    return map
  }, [quotes, pendingFollowUp])

  const shown = useMemo(() => {
    const list =
      filter === 'todos'
        ? quotes
        : filter === 'seguir'
          ? pendingFollowUp
          : quotes.filter((q) => q.status === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [quotes, filter, pendingFollowUp])

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

      {pendingFollowUp.length > 0 && filter !== 'seguir' ? (
        <Banner tone="warn">
          <span className="min-w-0 flex-1">
            {pendingFollowUp.length === 1
              ? 'Hay 1 presupuesto enviado sin respuesta.'
              : `Hay ${pendingFollowUp.length} presupuestos enviados sin respuesta.`}
          </span>
          <Button size="sm" variant="primary" onClick={() => setFilter('seguir')}>
            Ver cuáles
          </Button>
        </Banner>
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
          {(['todos', 'seguir', ...STATUS_ORDER] as Filter[]).map((f) => {
            const n = counts.get(f) ?? 0
            if (f === 'seguir') {
              return (
                <Chip
                  key={f}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                  className="shrink-0 gap-1.5 whitespace-nowrap"
                >
                  Para seguir
                  <span
                    className={cx(
                      'ml-1 inline-block min-w-5 rounded-full px-1.5 py-0.5 text-xs font-bold',
                      filter === f
                        ? 'bg-on-brand/20 text-on-brand'
                        : n > 0
                          ? 'bg-warn text-bg'
                          : 'bg-surface-2 text-muted'
                    )}
                  >
                    {n}
                  </span>
                </Chip>
              )
            }
            return (
              <Chip
                key={f}
                active={filter === f}
                onClick={() => setFilter(f)}
                className="shrink-0 whitespace-nowrap"
              >
                {f === 'todos' ? 'Todos' : STATUS_LABEL[f]} ({n})
              </Chip>
            )
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {filter === 'seguir'
            ? 'Nada para seguir: no hay presupuestos enviados hace 3 días o más sin respuesta.'
            : `No hay presupuestos ${
                filter === 'todos' ? '' : `en «${STATUS_LABEL[filter as QuoteStatus]}»`
              }.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((q) => {
            const total = quoteTotals(q).total
            const seguir = needsFollowUp(q)
            return (
              <li
                key={q.id}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                {/* El botón de seguimiento no puede ir dentro del de abrir:
                    un botón adentro de otro es HTML inválido y en el celular
                    se vuelve imposible de tocar sin abrir la ficha. */}
                <button
                  type="button"
                  onClick={() => onOpen(q.id)}
                  className="w-full p-3 text-left hover:bg-surface-2"
                >
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
                    </div>
                  </div>
                </button>

                {seguir ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-warn/40 bg-warn-soft px-3 py-2">
                    <span className="min-w-0 flex-1 text-xs font-medium text-ink">
                      Sin respuesta hace {daysSinceSent(q)} días
                    </span>
                    <Button size="sm" variant="primary" onClick={() => onFollowUp(q)}>
                      Hacer seguimiento
                    </Button>
                  </div>
                ) : null}
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
