/** Desglose visual del costo unitario por rubro. */
import type { CostBreakdown } from '../calc'
import { costShares } from '../calc'
import { formatCost, formatPercent, type CurrencyCode } from '../money'

const RUBROS = [
  { key: 'materials', label: 'Materiales', color: 'var(--fl-brand)' },
  { key: 'labor', label: 'Mano de obra', color: 'var(--fl-ok)' },
  { key: 'extras', label: 'Otros costos', color: 'var(--fl-warn)' },
  { key: 'fixed', label: 'Costos fijos', color: 'var(--fl-muted)' },
] as const

export function CostBar({
  breakdown,
  currency,
}: {
  breakdown: CostBreakdown
  currency: CurrencyCode
}) {
  const shares = costShares(breakdown)
  const empty = breakdown.total <= 0

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={
          empty
            ? 'Todavía no hay costos cargados'
            : RUBROS.map((r) => `${r.label}: ${formatPercent(shares[r.key])}`).join('; ')
        }
      >
        {RUBROS.map((r) =>
          shares[r.key] > 0 ? (
            <div
              key={r.key}
              style={{ width: `${shares[r.key]}%`, background: r.color }}
              className="h-full"
            />
          ) : null
        )}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {RUBROS.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: r.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{r.label}</span>
            <span className="tabular-nums font-medium">
              {formatCost(breakdown[r.key], currency)}
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
              {empty ? '—' : formatPercent(shares[r.key], 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
