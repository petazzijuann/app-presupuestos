/** KIT · Recordatorio suave para hacer una copia de los datos. */
import { useState } from 'react'
import { downloadBackup, shouldRemindBackup } from './backup'
import { useLimits } from './access'
import { Button, useToast } from './ui'

export function BackupReminder({ hasData }: { hasData: boolean }) {
  const limits = useLimits()
  const toast = useToast()
  const [hidden, setHidden] = useState(false)

  if (hidden || !limits.canExport || !shouldRemindBackup(hasData)) return null

  return (
    <div className="no-print mx-auto mt-3 flex w-full max-w-5xl items-center gap-3 rounded-xl border border-warn/40 bg-warn-soft px-3 py-2.5 text-sm">
      <p className="min-w-0 flex-1">Haz una copia de tus datos, por las dudas.</p>
      <Button
        size="sm"
        variant="primary"
        onClick={() => {
          downloadBackup()
          toast('Descargamos tu copia de seguridad.')
          setHidden(true)
        }}
      >
        Exportar
      </Button>
      <button
        onClick={() => setHidden(true)}
        aria-label="Cerrar aviso"
        className="shrink-0 rounded-lg px-2 py-1 text-muted hover:text-ink"
      >
        ✕
      </button>
    </div>
  )
}
