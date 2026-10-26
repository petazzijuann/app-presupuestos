/**
 * HERRAMIENTA · Calculadora de costos y precio de venta.
 * Es lo único que cambia entre microapps: el kit (licencia, demo, datos,
 * layout) vive en src/kit y no debería tocarse.
 */
import { useEffect, useMemo, useState } from 'react'
import { useAccess, useLimits } from '../kit/access'
import { BackupReminder } from '../kit/BackupReminder'
import { DemoBar } from '../kit/DemoBar'
import { Header } from '../kit/Header'
import { InstallPrompt } from '../kit/pwa'
import { useStored } from '../kit/storage'
import { useTheme } from '../kit/theme'
import { Banner, Button, Modal, useToast, cx } from '../kit/ui'
import { summarize } from './calc'
import { emptyData, migrate, newProduct, sampleData, uid } from './defaults'
import { ProductEditor } from './components/ProductEditor'
import { EmptyState, ProductList } from './components/ProductList'
import { PricePanel } from './components/PricePanel'
import { ProductSheet } from './components/ProductSheet'
import { SettingsPanel } from './components/SettingsPanel'
import type { AppData, Product } from './types'

type View = { tab: 'productos' | 'ajustes'; productId: string | null }

export function Tool() {
  const { mode, notice } = useAccess()
  const limits = useLimits()
  const toast = useToast()
  const { theme, toggle } = useTheme()
  const [data, setData] = useStored<AppData>('data', emptyData())
  const [view, setView] = useState<View>({ tab: 'productos', productId: null })
  const [toDelete, setToDelete] = useState<Product | null>(null)

  // Normaliza una sola vez lo que había guardado (o lo que se importó).
  useEffect(() => {
    setData((d) => migrate(d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (fn: (d: AppData) => AppData) => setData(fn)
  const product = data.products.find((p) => p.id === view.productId) ?? null
  const summary = useMemo(
    () => (product ? summarize(product, data.settings, data.channels) : null),
    [product, data.settings, data.channels]
  )

  const atLimit = data.products.length >= limits.maxProducts

  function createProduct() {
    if (atLimit) {
      toast(`La demo permite hasta ${limits.maxProducts} productos.`, 'danger')
      return
    }
    const p = newProduct()
    update((d) => ({ ...d, products: [...d.products, p] }))
    setView({ tab: 'productos', productId: p.id })
  }

  function duplicateProduct(id: string) {
    if (atLimit) {
      toast(`La demo permite hasta ${limits.maxProducts} productos.`, 'danger')
      return
    }
    update((d) => {
      const src = d.products.find((p) => p.id === id)
      if (!src) return d
      const copy: Product = {
        ...src,
        id: uid(),
        name: `${src.name} (copia)`,
        createdAt: Date.now(),
        materials: src.materials.map((m) => ({ ...m, id: uid() })),
        extras: src.extras.map((e) => ({ ...e, id: uid() })),
      }
      return { ...d, products: [...d.products, copy] }
    })
    toast('Producto duplicado.')
  }

  function patchProduct(id: string, patch: Partial<Product>) {
    update((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  function printSheet() {
    if (!limits.canPdf) {
      toast('Descargar el PDF está disponible en la versión completa.', 'danger')
      return
    }
    window.print()
  }

  return (
    <>
      {mode === 'demo' ? <DemoBar /> : null}

      <div className="print:hidden">
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

        <main className="mx-auto w-full max-w-5xl px-3 pb-24 sm:px-4">
          <InstallPrompt />
          <BackupReminder hasData={data.products.length > 0} />
          {notice ? (
            <Banner tone="warn" className="mt-3">
              {notice}
            </Banner>
          ) : null}

          <nav className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" aria-label="Secciones">
            {(
              [
                ['productos', 'Productos'],
                ['ajustes', 'Ajustes'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                aria-current={view.tab === tab ? 'page' : undefined}
                onClick={() => setView({ tab, productId: tab === 'ajustes' ? null : view.productId })}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  view.tab === tab ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-4">
            {view.tab === 'ajustes' ? (
              <SettingsPanel data={data} update={update} />
            ) : product && summary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView({ tab: 'productos', productId: null })}
                  >
                    ← Todos los productos
                  </Button>
                  <Button
                    size="sm"
                    onClick={printSheet}
                    title={limits.canPdf ? undefined : 'Disponible en la versión completa'}
                  >
                    Descargar PDF
                  </Button>
                </div>
                <PricePanel
                  product={product}
                  settings={data.settings}
                  summary={summary}
                  onChange={(patch) => patchProduct(product.id, patch)}
                />
                <ProductEditor
                  product={product}
                  settings={data.settings}
                  onChange={(patch) => patchProduct(product.id, patch)}
                  onOpenSettings={() => setView({ tab: 'ajustes', productId: product.id })}
                />
                <div className="flex justify-end">
                  <Button variant="danger" onClick={() => setToDelete(product)}>
                    Borrar producto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="font-display text-xl font-bold">Tus productos</h1>
                  <Button variant="primary" size="sm" onClick={createProduct} disabled={atLimit}>
                    + Nuevo producto
                  </Button>
                </div>
                {atLimit ? (
                  <Banner tone="info">
                    La demo llega hasta {limits.maxProducts} productos. Con la versión completa no
                    hay límite.
                  </Banner>
                ) : null}
                {data.products.length === 0 ? (
                  <EmptyState
                    onCreate={createProduct}
                    onLoadSample={() => {
                      const sample = sampleData()
                      setData(sample)
                      setView({ tab: 'productos', productId: sample.products[0].id })
                      toast('Cargamos un producto de ejemplo para que lo mires.')
                    }}
                  />
                ) : (
                  <ProductList
                    data={data}
                    onOpen={(id) => setView({ tab: 'productos', productId: id })}
                    onDuplicate={duplicateProduct}
                    onDelete={setToDelete}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Solo se ve al imprimir / guardar como PDF */}
      {product && summary && limits.canPdf ? (
        <div className="hidden print:block">
          <ProductSheet product={product} settings={data.settings} summary={summary} />
        </div>
      ) : null}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Borrar producto"
        footer={
          <>
            <Button onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                const id = toDelete?.id
                update((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }))
                if (view.productId === id) setView({ tab: 'productos', productId: null })
                setToDelete(null)
                toast('Producto borrado.')
              }}
            >
              Sí, borrar
            </Button>
          </>
        }
      >
        <p>
          Vas a borrar <strong>{toDelete?.name || 'este producto'}</strong> y no se puede deshacer.
        </p>
      </Modal>
    </>
  )
}
