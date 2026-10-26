/**
 * HERRAMIENTA · Controles que el kit no tiene y que esta app usa en todas las
 * pantallas. Pensados para el dedo: alto cómodo y nada de menús chiquitos.
 */
import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Field, cx } from '../../kit/ui'

export function Textarea({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea id={id} rows={3} {...props} className={cx('fl-input resize-y', className)} />
    </Field>
  )
}

/** Botón-etiqueta que se enciende: selección múltiple de oficios, filtros… */
export function Chip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cx(
        'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-line bg-surface text-muted hover:text-ink',
        className
      )}
    >
      {children}
    </button>
  )
}

/** Dos o tres opciones excluyentes, en una sola fila. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="min-w-0">
      {label ? <span className="fl-label">{label}</span> : null}
      <div
        role="group"
        aria-label={label}
        className="grid gap-1 rounded-xl bg-surface-2 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-10 truncate rounded-lg px-2 text-sm font-medium transition-colors',
              value === o.value ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Interruptor de encendido/apagado con el texto al lado. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[var(--fl-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  )
}

/** Dato grande del resumen del mes. */
export function Stat({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: ReactNode
  tone?: 'ink' | 'ok' | 'warn' | 'brand'
}) {
  const tones = {
    ink: 'text-ink',
    ok: 'text-ok',
    warn: 'text-warn',
    brand: 'text-brand',
  } as const
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={cx('truncate font-display text-lg font-bold', tones[tone])}>{value}</p>
    </div>
  )
}

/** Fila de lista tocable de punta a punta. */
export function Row({
  onClick,
  children,
  className,
}: {
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  const base = 'w-full min-w-0 rounded-xl border border-line bg-surface p-3 text-left'
  if (!onClick) return <div className={cx(base, className)}>{children}</div>
  return (
    <button type="button" onClick={onClick} className={cx(base, 'hover:bg-surface-2', className)}>
      {children}
    </button>
  )
}
