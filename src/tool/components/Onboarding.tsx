/**
 * HERRAMIENTA · Asistente de la primera vez, en 3 pasos.
 * Lo mínimo para poder emitir el primer presupuesto hoy mismo; todo lo demás
 * se puede ajustar después en "Mi negocio".
 */
import { useMemo, useState } from 'react'
import { Logo } from '../../kit/Logo'
import { Banner, Button, NumberInput, Select, TextInput, cx } from '../../kit/ui'
import { CURRENCY_LIST } from '../money'
import { TRADES, seedCount } from '../trades'
import { Chip, Switch, Textarea } from './fields'
import { LogoPicker } from './ImagePicker'
import type { Business, TradeId } from '../types'

const STEPS = ['Tu negocio', 'Tu oficio', 'Tus condiciones'] as const

export function Onboarding({
  business,
  onPatch,
  onFinish,
}: {
  business: Business
  onPatch: (patch: Partial<Business>) => void
  onFinish: () => void
}) {
  const [step, setStep] = useState(0)

  const items = useMemo(
    () => business.trades.reduce((acc, t) => acc + seedCount(t), 0),
    [business.trades]
  )
  const canContinue = step === 0 ? business.name.trim().length > 0 : step === 1 ? business.trades.length > 0 : true

  const toggleTrade = (id: TradeId) =>
    onPatch({
      trades: business.trades.includes(id)
        ? business.trades.filter((t) => t !== id)
        : [...business.trades, id],
    })

  const patchTerms = (patch: Partial<Business['terms']>) =>
    onPatch({ terms: { ...business.terms, ...patch } })

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-16 pt-6 sm:px-4">
      <div className="mb-5 flex items-center gap-3">
        <Logo size={34} />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold leading-tight">Vamos a configurarte</h1>
          <p className="text-sm text-muted">Tres pasos y ya podés presupuestar.</p>
        </div>
      </div>

      <ol className="mb-5 grid grid-cols-3 gap-1.5" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <div
              className={cx(
                'h-1.5 rounded-full',
                i <= step ? 'bg-brand' : 'bg-surface-2'
              )}
              aria-hidden="true"
            />
            <p
              className={cx(
                'mt-1.5 truncate text-[11px] font-semibold',
                i === step ? 'text-ink' : 'text-muted'
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="fl-card space-y-4 p-4">
        {step === 0 ? (
          <>
            <TextInput
              label="Nombre o razón social"
              placeholder="Electricidad Rivas"
              autoFocus
              value={business.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              hint="Es lo que ve el cliente arriba del presupuesto."
            />
            <TextInput
              label="Teléfono / WhatsApp"
              type="tel"
              inputMode="tel"
              placeholder="11 5566 7788"
              value={business.phone}
              onChange={(e) => onPatch({ phone: e.target.value })}
            />
            <TextInput
              label="Zona de trabajo"
              placeholder="CABA y zona norte"
              value={business.area}
              onChange={(e) => onPatch({ area: e.target.value })}
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
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <span className="fl-label">¿A qué te dedicás?</span>
              <p className="mb-2 text-xs text-muted">
                Podés elegir más de uno. Te dejamos el catálogo armado, sin precios.
              </p>
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
            </div>
            {items > 0 ? (
              <Banner tone="ok">
                Te vamos a cargar {items} ítems típicos. Después les pones tu precio.
              </Banner>
            ) : (
              <Banner tone="info">Elegí al menos un oficio para seguir.</Banner>
            )}
            <LogoPicker logoId={business.logoId} onChange={(logoId) => onPatch({ logoId })} />
          </>
        ) : null}

        {step === 2 ? (
          <>
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
                onValue={(depositPercent) => patchTerms({ depositPercent: Math.min(100, depositPercent) })}
              />
            </div>
            <Textarea
              label="Forma de pago"
              rows={2}
              value={business.terms.payment}
              onChange={(e) => patchTerms({ payment: e.target.value })}
            />
            <Textarea
              label="Garantía"
              rows={2}
              value={business.terms.warranty}
              onChange={(e) => patchTerms({ warranty: e.target.value })}
            />
            <Switch
              label="Discriminar IVA"
              hint="Si sos monotributista, dejalo apagado."
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
            <p className="text-xs text-muted">
              Todo esto se copia a cada presupuesto nuevo y lo podés cambiar ahí mismo.
            </p>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        {step > 0 ? (
          <Button size="lg" onClick={() => setStep((s) => s - 1)} className="flex-1">
            Atrás
          </Button>
        ) : null}
        <Button
          size="lg"
          variant="primary"
          disabled={!canContinue}
          onClick={() => (step < 2 ? setStep((s) => s + 1) : onFinish())}
          className="flex-[2]"
        >
          {step < 2 ? 'Seguir' : 'Empezar a presupuestar'}
        </Button>
      </div>
      {step === 0 && !canContinue ? (
        <p className="mt-2 text-center text-xs text-muted">Escribí el nombre para seguir.</p>
      ) : null}
    </div>
  )
}
