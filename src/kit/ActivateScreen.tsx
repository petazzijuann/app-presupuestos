/** KIT · Pantalla de activación (lo primero que ve quien todavía no compró). */
import { useState, type FormEvent } from 'react'
import { config } from '../config'
import { useAccess } from './access'
import { LicenseError, LICENSE_MESSAGES } from './license'
import { Banner, Button, LinkButton } from './ui'
import { Logo } from './Logo'

/** true si el visitante está en Argentina (mostramos primero el pago en pesos). */
export function prefersARS() {
  try {
    return /America\/Argentina/.test(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '')
  } catch {
    return false
  }
}

export function ActivateScreen() {
  const { activate, startDemo, notice } = useAccess()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await activate(key)
    } catch (err) {
      setError(err instanceof LicenseError ? err.message : LICENSE_MESSAGES.server)
    } finally {
      setBusy(false)
    }
  }

  // El botón de la región del visitante va primero y es el destacado.
  const preferARS = prefersARS()
  const ars = config.buyUrlARS ? (
    <LinkButton
      key="ars"
      href={config.buyUrlARS}
      target="_blank"
      rel="noopener"
      variant={preferARS || !config.buyUrlUSD ? 'primary' : 'secondary'}
      size="lg"
      className="w-full"
    >
      Comprar en pesos · {config.price.ars}
    </LinkButton>
  ) : null
  const usd = config.buyUrlUSD ? (
    <LinkButton
      key="usd"
      href={config.buyUrlUSD}
      target="_blank"
      rel="noopener"
      variant={preferARS && config.buyUrlARS ? 'secondary' : 'primary'}
      size="lg"
      className="w-full"
    >
      Comprar en USD · {config.price.usd}
    </LinkButton>
  ) : null
  const buyButtons = preferARS ? [ars, usd] : [usd, ars]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <Logo className="mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Activa tu licencia de {config.appName}
        </h1>
        <p className="mt-2 text-sm text-muted">{config.tagline}</p>
      </header>

      {notice ? <Banner tone="warn">{notice}</Banner> : null}

      <form onSubmit={onSubmit} className="fl-card space-y-3 p-5" noValidate>
        <div>
          <label className="fl-label" htmlFor="license-key">
            Tu clave de licencia
          </label>
          <input
            id="license-key"
            className="fl-input font-mono tracking-wide uppercase"
            placeholder="FL-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setError(null)
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'license-error' : 'license-help'}
          />
        </div>

        {error ? (
          <p id="license-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Activando…' : 'Activar'}
        </Button>

        <p id="license-help" className="text-xs leading-relaxed text-muted">
          Puedes usar tu clave en hasta {config.maxDevices} dispositivos. Tus datos se guardan en
          cada dispositivo; usa Exportar/Importar para pasarlos de uno a otro.
        </p>
      </form>

      <div className="space-y-2">
        <p className="text-center text-sm text-muted">¿Todavía no la tienes? Es un pago único.</p>
        {buyButtons}
        <Button variant="ghost" size="md" className="w-full" onClick={startDemo}>
          Probar demo gratis
        </Button>
      </div>

      <footer className="text-center text-xs text-muted">
        <a className="underline underline-offset-2" href={config.landingUrl}>
          Ver qué hace {config.appName}
        </a>
        {' · '}
        <a className="underline underline-offset-2" href={`mailto:${config.supportEmail}`}>
          {config.supportEmail}
        </a>
      </footer>
    </main>
  )
}
