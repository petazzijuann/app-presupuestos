/** KIT · Estado de acceso: bloqueado, licencia completa o demo. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { config } from '../config'
import {
  LicenseError,
  activate as apiActivate,
  deactivate as apiDeactivate,
  validate as apiValidate,
  clearLicense,
  loadLicense,
  needsRevalidation,
  offlineDaysLeft,
  withinOfflineGrace,
  type StoredLicense,
} from './license'

export type AccessMode = 'loading' | 'locked' | 'full' | 'demo'

type AccessValue = {
  mode: AccessMode
  license: StoredLicense | null
  /** Aviso no bloqueante (por ejemplo: validando sin internet). */
  notice: string | null
  /** true si la app está en demo y hay que respetar los límites. */
  isDemo: boolean
  activate: (key: string) => Promise<void>
  deactivate: () => Promise<void>
  startDemo: () => void
  exitDemo: () => void
}

const Ctx = createContext<AccessValue | null>(null)

export function useAccess() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAccess debe usarse dentro de <AccessProvider>')
  return ctx
}

/** Límites de la demo aplicados en un solo lugar. */
export function useLimits() {
  const { isDemo } = useAccess()
  return useMemo(
    () => ({
      isDemo,
      /** Tope de registros principales de la herramienta (acá: presupuestos). */
      maxRecords: isDemo ? config.demo.maxRecords : Infinity,
      canExport: isDemo ? config.demo.allowExport : true,
      canImport: isDemo ? config.demo.allowImport : true,
      canPdf: isDemo ? config.demo.allowPdf : true,
      /** Imágenes propias (logo, fotos del trabajo). */
      canImages: isDemo ? config.demo.allowImages : true,
      /** Compartir el archivo PDF con la Web Share API. */
      canShareFile: isDemo ? config.demo.allowShareFile : true,
      /** Texto de la marca de agua del PDF, o null si no corresponde. */
      pdfWatermark: isDemo ? config.demo.pdfWatermark : null,
    }),
    [isDemo]
  )
}

const demoRequested = () =>
  typeof location !== 'undefined' &&
  (location.search.includes('demo') || location.hash.includes('demo'))

export function AccessProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AccessMode>('loading')
  const [license, setLicense] = useState<StoredLicense | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Arranque: licencia guardada -> revalidación perezosa -> demo por URL.
  useEffect(() => {
    let alive = true
    const stored = loadLicense()
    if (!stored) {
      setMode(demoRequested() ? 'demo' : 'locked')
      return
    }
    setLicense(stored)
    setMode('full')
    if (!needsRevalidation(stored)) return

    apiValidate(stored)
      .then((updated) => {
        if (!alive) return
        setLicense(updated)
        setNotice(null)
      })
      .catch((e: unknown) => {
        if (!alive) return
        const code = e instanceof LicenseError ? e.code : 'server'
        if (code === 'offline' || code === 'server') {
          if (withinOfflineGrace(stored)) {
            const left = offlineDaysLeft(stored)
            setNotice(
              `No pudimos verificar tu licencia (sin conexión). Puedes seguir usando la app ${left} día${
                left === 1 ? '' : 's'
              } más.`
            )
          } else {
            clearLicense()
            setLicense(null)
            setMode('locked')
            setNotice(
              'Pasaron más de ' +
                config.license.offlineGraceDays +
                ' días sin poder verificar tu licencia. Conéctate a internet y activala de nuevo.'
            )
          }
          return
        }
        // La clave dejó de ser válida: se bloquea.
        clearLicense()
        setLicense(null)
        setMode('locked')
        setNotice(e instanceof LicenseError ? e.message : null)
      })
    return () => {
      alive = false
    }
  }, [])

  const activate = useCallback(async (key: string) => {
    const l = await apiActivate(key)
    setLicense(l)
    setNotice(null)
    setMode('full')
  }, [])

  const deactivate = useCallback(async () => {
    if (license) await apiDeactivate(license)
    else clearLicense()
    setLicense(null)
    setNotice(null)
    setMode('locked')
  }, [license])

  const startDemo = useCallback(() => {
    setNotice(null)
    setMode('demo')
  }, [])
  const exitDemo = useCallback(() => setMode('locked'), [])

  const value = useMemo<AccessValue>(
    () => ({
      mode,
      license,
      notice,
      isDemo: mode === 'demo',
      activate,
      deactivate,
      startDemo,
      exitDemo,
    }),
    [mode, license, notice, activate, deactivate, startDemo, exitDemo]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
