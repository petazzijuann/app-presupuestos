/**
 * HERRAMIENTA · Presupuestos para oficios.
 * Es lo único que cambia entre microapps: el kit (licencia, demo, datos,
 * layout) vive en src/kit y casi no se toca.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccess, useLimits } from '../kit/access'
import { BackupReminder } from '../kit/BackupReminder'
import { registerBackupExtra } from '../kit/backup'
import { DemoBar } from '../kit/DemoBar'
import { Header } from '../kit/Header'
import { InstallPrompt } from '../kit/pwa'
import { useStored } from '../kit/storage'
import { useTheme } from '../kit/theme'
import { Banner, Button, Modal, useToast, cx } from '../kit/ui'
import { STATUS_LABEL, businessGaps, followUpQuotes } from './calc'
import {
  duplicateQuote,
  emptyData,
  migrate,
  newQuote,
  quoteFromTemplate,
  sampleData,
  templateFromQuote,
  uid,
} from './defaults'
import { allImages, getImage, getImages, pruneImages, restoreImages } from './images'
import { buildQuotePdf, buildReceiptPdf, type PdfResult } from './pdf'
import {
  copyText,
  downloadBlob,
  followUpMessage,
  openWhatsApp,
  quoteSummaryText,
  sendMessage,
  sharePdf,
} from './share'
import { seedCatalog } from './trades'
import { BusinessPanel } from './components/BusinessPanel'
import { CatalogPanel } from './components/CatalogPanel'
import { ClientsPanel } from './components/ClientsPanel'
import { Onboarding } from './components/Onboarding'
import { QuoteEditor, type QuoteActions } from './components/QuoteEditor'
import { EmptyState, QuoteList } from './components/QuoteList'
import type { AppData, Business, CatalogItem, Client, Quote, QuoteLine } from './types'

type Tab = 'presupuestos' | 'catalogo' | 'clientes' | 'negocio'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'presupuestos', label: 'Presup.', icon: '📄' },
  { id: 'catalogo', label: 'Catálogo', icon: '📋' },
  { id: 'clientes', label: 'Clientes', icon: '👤' },
  { id: 'negocio', label: 'Mi negocio', icon: '🔧' },
]

export function Tool() {
  const { mode, notice } = useAccess()
  const limits = useLimits()
  const toast = useToast()
  const { theme, toggle } = useTheme()
  const [data, setData] = useStored<AppData>('data', emptyData())
  const [tab, setTab] = useState<Tab>('presupuestos')
  const [openId, setOpenId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Quote | null>(null)
  const [busy, setBusy] = useState(false)
  /** true mientras el asistente se abre desde "Mi negocio" y no por primera vez. */
  const [rerunWizard, setRerunWizard] = useState(false)
  const migrated = useRef(false)

  // Normaliza una sola vez lo que había guardado (o lo que se importó).
  useEffect(() => {
    if (migrated.current) return
    migrated.current = true
    setData((d) => migrate(d))
  }, [setData])

  // La copia de seguridad del kit también se lleva las imágenes de IndexedDB.
  useEffect(() => {
    registerBackupExtra({ collect: allImages, restore: (files) => restoreImages(files).then(() => {}) })
    return () => registerBackupExtra(null)
  }, [])

  const { business, catalog, clients, quotes, templates } = data
  const quote = quotes.find((q) => q.id === openId) ?? null
  const client = quote ? (clients.find((c) => c.id === quote.clientId) ?? null) : null

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), [setData])

  const patchBusiness = (patch: Partial<Business>) =>
    update((d) => ({ ...d, business: { ...d.business, ...patch } }))

  const patchQuote = (id: string, patch: Partial<Quote>) =>
    update((d) => ({ ...d, quotes: d.quotes.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))

  const atLimit = quotes.length >= limits.maxRecords
  const gaps = businessGaps(business)
  const pendingFollowUp = followUpQuotes(quotes)

  /* ------------------------------ Presupuestos ------------------------------ */

  function create(from?: Quote) {
    if (atLimit) {
      toast(`La demo permite hasta ${limits.maxRecords} presupuestos.`, 'danger')
      return
    }
    const next = from ?? newQuote(business, quotes)
    update((d) => ({ ...d, quotes: [...d.quotes, next] }))
    setTab('presupuestos')
    setOpenId(next.id)
  }

  function setStatus(id: string, status: Quote['status']) {
    update((d) => ({
      ...d,
      quotes: d.quotes.map((q) =>
        q.id === id ? { ...q, status, statusAt: { ...q.statusAt, [status]: Date.now() } } : q
      ),
    }))
    toast(`Marcado como ${STATUS_LABEL[status].toLowerCase()}.`)
  }

  function saveClient(next: Client) {
    update((d) => ({
      ...d,
      clients: d.clients.some((c) => c.id === next.id)
        ? d.clients.map((c) => (c.id === next.id ? next : c))
        : [...d.clients, next],
    }))
  }

  /** Ítems de los oficios elegidos que todavía no están en el catálogo. */
  function missingSeeds(current: CatalogItem[], trades: Business['trades']) {
    const have = new Set(current.map((i) => `${i.kind}|${i.name.toLowerCase()}`))
    return seedCatalog(trades, uid).filter((s) => !have.has(`${s.kind}|${s.name.toLowerCase()}`))
  }

  /** Suma al catálogo los ítems de los oficios elegidos que todavía no estén. */
  function syncCatalog() {
    const missing = missingSeeds(catalog, business.trades)
    if (!missing.length) {
      toast('Ya tenías todos los ítems de tus oficios.')
      return
    }
    update((d) => ({ ...d, catalog: [...d.catalog, ...missing] }))
    toast(`Agregamos ${missing.length} ítems al catálogo.`)
  }

  /* --------------------------------- Salidas --------------------------------- */

  /** Arma el PDF con el logo y las fotos ya resueltas desde IndexedDB. */
  const makePdf = useCallback(
    async (target: Quote, kind: 'presupuesto' | 'comprobante'): Promise<PdfResult | null> => {
      setBusy(true)
      try {
        // En la demo no entran ni el logo ni las fotos.
        const stored = limits.canImages ? await getImages(target.photoIds) : {}
        const photos = target.photoIds.map((id) => stored[id]).filter(Boolean).slice(0, 3)
        const logo = limits.canImages && business.logoId ? await getImage(business.logoId) : null
        const build = kind === 'comprobante' ? buildReceiptPdf : buildQuotePdf
        return await build({
          quote: target,
          business,
          client: clients.find((c) => c.id === target.clientId) ?? null,
          logo,
          photos,
          watermark: limits.pdfWatermark,
        })
      } catch {
        toast('No pudimos armar el PDF. Probá de nuevo.', 'danger')
        return null
      } finally {
        setBusy(false)
      }
    },
    [business, clients, limits.canImages, limits.pdfWatermark, toast]
  )

  const actions = useMemo<QuoteActions | null>(() => {
    if (!quote) return null
    const currency = business.currency
    return {
      onDuplicate: () => {
        if (atLimit) {
          toast(`La demo permite hasta ${limits.maxRecords} presupuestos.`, 'danger')
          return
        }
        const copy = duplicateQuote(quote, quotes, business.quotePrefix)
        update((d) => ({ ...d, quotes: [...d.quotes, copy] }))
        setOpenId(copy.id)
        toast(`Duplicado como ${copy.number}.`)
      },
      onSaveTemplate: (name) => {
        const template = templateFromQuote(quote, name)
        update((d) => ({ ...d, templates: [...d.templates, template] }))
        toast('Plantilla guardada.')
      },
      onDelete: () => setToDelete(quote),
      onSendPdf: () => {
        void (async () => {
          const pdf = await makePdf(quote, 'presupuesto')
          if (!pdf) return
          const text = sendMessage(quote, business, client, currency)
          const outcome = await sharePdf(
            pdf.blob,
            pdf.fileName,
            `Presupuesto ${quote.number}`,
            text,
            limits.canShareFile
          )
          URL.revokeObjectURL(pdf.url)
          if (outcome === 'downloaded') {
            toast('Descargamos el PDF. Adjuntalo en el chat que acabamos de abrir.')
            openWhatsApp(client?.phone ?? '', text)
          }
          if (outcome !== 'cancelled' && quote.status === 'borrador') setStatus(quote.id, 'enviado')
        })()
      },
      onDownloadPdf: () => {
        void (async () => {
          const pdf = await makePdf(quote, 'presupuesto')
          if (!pdf) return
          downloadBlob(pdf.blob, pdf.fileName)
          URL.revokeObjectURL(pdf.url)
          toast('PDF descargado.')
        })()
      },
      onCopySummary: () => {
        void (async () => {
          const ok = await copyText(quoteSummaryText(quote, business, client, currency))
          toast(ok ? 'Resumen copiado: pegalo en WhatsApp.' : 'No pudimos copiar el texto.', ok ? 'ok' : 'danger')
        })()
      },
      onFollowUp: () => openWhatsApp(client?.phone ?? '', followUpMessage(quote, business, client, currency)),
      onReceipt: () => {
        void (async () => {
          const pdf = await makePdf(quote, 'comprobante')
          if (!pdf) return
          const text = `Hola${client?.name ? ` ${client.name.split(' ')[0]}` : ''}, te dejo el comprobante del trabajo ${quote.number}.`
          const outcome = await sharePdf(
            pdf.blob,
            pdf.fileName,
            `Comprobante ${quote.number}`,
            text,
            limits.canShareFile
          )
          URL.revokeObjectURL(pdf.url)
          if (outcome === 'downloaded') toast('Comprobante descargado.')
        })()
      },
      onAddToCatalog: (line: QuoteLine) => {
        const item: CatalogItem = {
          id: uid(),
          kind: line.kind,
          name: line.name.trim(),
          unit: line.unit,
          price: line.price,
          category: line.kind === 'material' ? 'Materiales' : 'Mano de obra',
        }
        update((d) => ({ ...d, catalog: [...d.catalog, item] }))
        toast('Guardado en tu catálogo.')
        return item.id
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, business, client, quotes, atLimit, limits, makePdf, update])

  /* -------------------------------- Asistente -------------------------------- */

  if (!data.onboarded) {
    return (
      <>
        {mode === 'demo' ? <DemoBar /> : null}
        <Onboarding
          business={business}
          onPatch={patchBusiness}
          onExit={
            rerunWizard
              ? () => {
                  update((d) => ({ ...d, onboarded: true }))
                  setRerunWizard(false)
                  setTab('negocio')
                }
              : undefined
          }
          onFinish={() => {
            // Si se agregó un oficio, entran sus ítems; los que ya estaban no se duplican.
            const missing = missingSeeds(catalog, business.trades)
            update((d) => ({
              ...d,
              onboarded: true,
              catalog: [...d.catalog, ...missing],
            }))
            if (rerunWizard) {
              setRerunWizard(false)
              setTab('negocio')
            }
            toast(
              missing.length
                ? `Listo. Te dejamos ${missing.length} ítems en el catálogo para ponerles precio.`
                : 'Listo, ya podés presupuestar.'
            )
          }}
        />
      </>
    )
  }

  /* ---------------------------------- App ---------------------------------- */

  return (
    <>
      {mode === 'demo' ? <DemoBar /> : null}

      <Header
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-3xl px-3 pb-28 sm:px-4">
        <InstallPrompt />
        <BackupReminder hasData={quotes.length > 0} />
        {notice ? (
          <Banner tone="warn" className="mt-3">
            {notice}
          </Banner>
        ) : null}

        {/* El negocio incompleto se avisa desde cualquier pantalla: es lo que
            el cliente ve arriba del presupuesto. */}
        {gaps.length > 0 && tab !== 'negocio' ? (
          <Banner tone="warn" className="mt-3">
            <span className="min-w-0 flex-1">
              Completa los datos de tu negocio para que aparezcan en tus presupuestos.
            </span>
            <Button size="sm" variant="primary" onClick={() => setTab('negocio')}>
              Completar
            </Button>
          </Banner>
        ) : null}

        <div className="mt-4">
          {tab === 'presupuestos' ? (
            quote && actions ? (
              <QuoteEditor
                quote={quote}
                business={business}
                catalog={catalog}
                clients={clients}
                onPatch={(patch) => patchQuote(quote.id, patch)}
                onStatus={(status) => setStatus(quote.id, status)}
                onClient={saveClient}
                onBack={() => setOpenId(null)}
                actions={actions}
                busy={busy}
              />
            ) : quotes.length === 0 ? (
              <EmptyState
                onNew={() => create()}
                canSample={!limits.isDemo}
                onLoadSample={() => {
                  const sample = sampleData()
                  setData(sample)
                  toast('Cargamos un ejemplo completo para que lo mires.')
                }}
              />
            ) : (
              <>
                {atLimit ? (
                  <Banner tone="info" className="mb-4">
                    La demo llega hasta {limits.maxRecords} presupuestos. Con la versión completa no
                    hay límite.
                  </Banner>
                ) : null}
                <QuoteList
                  quotes={quotes}
                  clients={clients}
                  templates={templates}
                  currency={business.currency}
                  onOpen={setOpenId}
                  onNew={() => create()}
                  atLimit={atLimit}
                  onFollowUp={(q) =>
                    openWhatsApp(
                      clients.find((c) => c.id === q.clientId)?.phone ?? '',
                      followUpMessage(q, business, clients.find((c) => c.id === q.clientId) ?? null, business.currency)
                    )
                  }
                  onFromTemplate={(t) => create(quoteFromTemplate(t, business, quotes))}
                  onDeleteTemplate={(id) => {
                    update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }))
                    toast('Plantilla borrada.')
                  }}
                />
              </>
            )
          ) : null}

          {tab === 'catalogo' ? (
            <CatalogPanel
              catalog={catalog}
              currency={business.currency}
              onChange={(next) => update((d) => ({ ...d, catalog: next }))}
            />
          ) : null}

          {tab === 'clientes' ? (
            <ClientsPanel
              clients={clients}
              quotes={quotes}
              onChange={(next) => update((d) => ({ ...d, clients: next }))}
            />
          ) : null}

          {tab === 'negocio' ? (
            <BusinessPanel
              business={business}
              onPatch={patchBusiness}
              onSyncCatalog={syncCatalog}
              catalogCount={catalog.length}
              onRerunWizard={() => {
                setRerunWizard(true)
                update((d) => ({ ...d, onboarded: false }))
              }}
            />
          ) : null}
        </div>
      </main>

      {/* Navegación abajo: se usa con una mano, con el pulgar. */}
      <nav
        aria-label="Secciones"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4">
          {TABS.map((t) => {
            const active = tab === t.id
            // El seguimiento pendiente se ve desde cualquier pantalla.
            const badge = t.id === 'presupuestos' ? pendingFollowUp.length : 0
            return (
              <button
                key={t.id}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  badge > 0 ? `${t.label} · ${badge} para seguir` : undefined
                }
                onClick={() => {
                  setTab(t.id)
                  if (t.id === 'presupuestos' && tab === 'presupuestos') setOpenId(null)
                }}
                className={cx(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-semibold transition-colors',
                  active ? 'text-brand' : 'text-muted hover:text-ink'
                )}
              >
                <span className="relative text-xl leading-none" aria-hidden="true">
                  {t.icon}
                  {badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1 grid min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold leading-4 text-bg">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate px-0.5">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Borrar presupuesto"
        footer={
          <>
            <Button onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                const dead = toDelete
                if (!dead) return
                update((d) => {
                  const quotes = d.quotes.filter((q) => q.id !== dead.id)
                  // Las fotos que ya no referencia nadie se van de IndexedDB.
                  void pruneImages([
                    ...quotes.flatMap((q) => q.photoIds),
                    ...(d.business.logoId ? [d.business.logoId] : []),
                  ])
                  return { ...d, quotes }
                })
                if (openId === dead.id) setOpenId(null)
                setToDelete(null)
                toast('Presupuesto borrado.')
              }}
            >
              Sí, borrar
            </Button>
          </>
        }
      >
        <p>
          Vas a borrar <strong>{toDelete?.number}</strong> y no se puede deshacer. El número no se
          vuelve a usar.
        </p>
      </Modal>
    </>
  )
}
