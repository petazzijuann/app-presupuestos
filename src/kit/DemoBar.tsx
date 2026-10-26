/** KIT · Barra fija del modo demo. */
import { config } from '../config'
import { prefersARS } from './ActivateScreen'
import { useAccess } from './access'

export function DemoBar() {
  const { exitDemo } = useAccess()
  const buyUrl = prefersARS()
    ? config.buyUrlARS || config.buyUrlUSD
    : config.buyUrlUSD || config.buyUrlARS

  return (
    <div className="no-print sticky top-0 z-40 bg-brand text-on-brand">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 py-2 text-sm sm:px-4">
        <p className="min-w-0 flex-1 truncate font-medium">
          Estás en la demo · hasta {config.demo.maxProducts} productos
        </p>
        {buyUrl ? (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener"
            className="shrink-0 rounded-lg bg-on-brand/15 px-3 py-1 font-semibold underline-offset-2 hover:bg-on-brand/25"
          >
            Comprar
          </a>
        ) : null}
        <button
          onClick={exitDemo}
          className="shrink-0 rounded-lg px-2 py-1 text-xs opacity-80 hover:opacity-100"
        >
          Tengo clave
        </button>
      </div>
    </div>
  )
}
