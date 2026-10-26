import { useEffect } from 'react'
import { AccessProvider, useAccess } from './kit/access'
import { ActivateScreen } from './kit/ActivateScreen'
import { requestPersistentStorage } from './kit/storage'
import { ToastProvider } from './kit/ui'
import { Tool } from './tool/Tool'

function Shell() {
  const { mode } = useAccess()

  if (mode === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted" role="status">
        Cargando…
      </div>
    )
  }
  if (mode === 'locked') return <ActivateScreen />
  return <Tool />
}

export default function App() {
  useEffect(() => {
    // Pedimos almacenamiento persistente para que el navegador no borre los datos.
    void requestPersistentStorage()
  }, [])

  return (
    <AccessProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AccessProvider>
  )
}
