/** KIT · Barra superior con el menú de la app. */
import { useEffect, useRef, useState } from 'react'
import { config } from '../config'
import { useAccess, useLimits } from './access'
import { downloadBackup, ImportError, importBackupFile, pickFile } from './backup'
import { Logo } from './Logo'
import { Button, Modal, useToast, cx } from './ui'

type MenuItem = {
  label: string
  /** Si tiene href, el ítem es un link real (se puede abrir en otra pestaña). */
  href?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

export function Header({ right }: { right?: React.ReactNode }) {
  const { mode, deactivate, license } = useAccess()
  const limits = useLimits()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function onImport() {
    const file = await pickFile()
    if (!file) return
    try {
      const n = await importBackupFile(file)
      toast(`Listo: importamos ${n} bloque${n === 1 ? '' : 's'} de datos.`)
      setTimeout(() => location.reload(), 600)
    } catch (e) {
      toast(e instanceof ImportError ? e.message : 'No pudimos leer ese archivo.', 'danger')
    }
  }

  const items: MenuItem[] = [
    {
      label: 'Exportar datos',
      disabled: !limits.canExport,
      onClick: () => {
        if (!limits.canExport) return toast('Exportar está disponible en la versión completa.', 'danger')
        downloadBackup()
        toast('Descargamos tu copia de seguridad.')
      },
    },
    {
      label: 'Importar datos',
      disabled: !limits.canImport,
      onClick: () => {
        if (!limits.canImport) return toast('Importar está disponible en la versión completa.', 'danger')
        void onImport()
      },
    },
    // La guía vive en la landing: así se actualiza sin tener que publicar la app.
    { label: 'Ayuda', href: config.helpUrl },
  ]
  if (mode === 'full') {
    items.push({
      label: 'Desactivar en este dispositivo',
      danger: true,
      onClick: () => setConfirmOff(true),
    })
  }

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-4">
          <Logo size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold leading-tight">
              {config.appName}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted">{config.brand}</p>
          </div>
          {right}
          <div className="relative" ref={menuRef}>
            <Button
              variant="secondary"
              size="sm"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              Menú
            </Button>
            {open ? (
              <div
                role="menu"
                className="fl-card absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden p-1"
              >
                {items.map((it) => {
                  const className = cx(
                    'block w-full rounded-lg px-3 py-2.5 text-left text-sm no-underline hover:bg-surface-2',
                    it.danger && 'text-danger',
                    it.disabled && 'opacity-50'
                  )
                  return it.href ? (
                    <a
                      key={it.label}
                      role="menuitem"
                      href={it.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className={className}
                    >
                      {it.label} ↗
                    </a>
                  ) : (
                    <button
                      key={it.label}
                      role="menuitem"
                      onClick={() => {
                        setOpen(false)
                        it.onClick?.()
                      }}
                      className={className}
                    >
                      {it.label}
                    </button>
                  )
                })}
                {license?.email ? (
                  <p className="px-3 pb-1 pt-2 text-[11px] text-muted">
                    Licencia de {license.email}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <Modal
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        title="Desactivar en este dispositivo"
        footer={
          <>
            <Button onClick={() => setConfirmOff(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await deactivate()
                  toast('Listo, liberamos este dispositivo.')
                } catch {
                  toast('No pudimos avisarle al servidor. Prueba con internet.', 'danger')
                }
                setConfirmOff(false)
              }}
            >
              Sí, desactivar
            </Button>
          </>
        }
      >
        <p>
          Vas a liberar uno de tus {config.maxDevices} dispositivos y vas a necesitar la clave para
          volver a entrar acá.
        </p>
        <p className="mt-2 text-muted">
          Tus datos quedan guardados en este navegador. Si vas a borrarlos o cambiar de equipo,
          exporta primero tu copia.
        </p>
      </Modal>
    </>
  )
}
