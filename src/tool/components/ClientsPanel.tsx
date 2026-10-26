/** HERRAMIENTA · Clientes. Se crean al vuelo desde el presupuesto. */
import { useMemo, useState } from 'react'
import { Button, Card, Modal, TextInput, useToast } from '../../kit/ui'
import { normalize } from '../calc'
import { uid } from '../defaults'
import { openWhatsApp } from '../share'
import { Row } from './fields'
import type { Client, Quote } from '../types'

export function emptyClient(name = ''): Client {
  return { id: uid(), name, phone: '', address: '' }
}

export function ClientsPanel({
  clients,
  quotes,
  onChange,
}: {
  clients: Client[]
  quotes: Quote[]
  onChange: (next: Client[]) => void
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | null>(null)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of quotes) {
      if (!q.clientId) continue
      map.set(q.clientId, (map.get(q.clientId) ?? 0) + 1)
    }
    return map
  }, [quotes])

  const shown = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const list = words.length
      ? clients.filter((c) => {
          const hay = normalize(`${c.name} ${c.phone} ${c.address}`)
          return words.every((w) => hay.includes(w))
        })
      : clients
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [clients, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Clientes</h1>
        <Button size="sm" variant="primary" onClick={() => setEditing(emptyClient())}>
          + Cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Todavía no tenés clientes. También se crean solos cuando cargás uno nuevo mientras
            armás un presupuesto.
          </p>
        </Card>
      ) : (
        <>
          <TextInput
            label="Buscar"
            type="search"
            inputMode="search"
            placeholder="nombre, teléfono o dirección"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nadie con esa búsqueda.</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((c) => (
                <li key={c.id}>
                  <Row onClick={() => setEditing(c)}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                        {c.phone ? <p className="truncate text-xs text-muted">{c.phone}</p> : null}
                        {c.address ? (
                          <p className="truncate text-xs text-muted">{c.address}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                        {counts.get(c.id) ?? 0} presup.
                      </span>
                    </div>
                  </Row>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ClientModal
        key={editing?.id ?? 'sin-cliente'}
        client={editing}
        existing={clients.some((c) => c.id === editing?.id)}
        usedIn={editing ? (counts.get(editing.id) ?? 0) : 0}
        onClose={() => setEditing(null)}
        onSave={(client) => {
          const exists = clients.some((c) => c.id === client.id)
          onChange(exists ? clients.map((c) => (c.id === client.id ? client : c)) : [...clients, client])
          setEditing(null)
          toast(exists ? 'Cliente guardado.' : 'Cliente agregado.')
        }}
        onDelete={(id) => {
          onChange(clients.filter((c) => c.id !== id))
          setEditing(null)
          toast('Cliente borrado.')
        }}
      />
    </div>
  )
}

export function ClientModal({
  client,
  existing,
  usedIn,
  onClose,
  onSave,
  onDelete,
}: {
  client: Client | null
  existing: boolean
  usedIn: number
  onClose: () => void
  onSave: (client: Client) => void
  onDelete?: (id: string) => void
}) {
  const [draft, setDraft] = useState<Client | null>(client)
  if (!client || !draft) return null
  const patch = (p: Partial<Client>) => setDraft({ ...draft, ...p })

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Editar cliente' : 'Cliente nuevo'}
      footer={
        <>
          {existing && onDelete ? (
            <Button variant="danger" onClick={() => onDelete(client.id)}>
              Borrar
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Nombre"
          autoFocus
          value={draft.name}
          placeholder="Marcela Duarte"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <TextInput
          label="Teléfono / WhatsApp"
          type="tel"
          inputMode="tel"
          value={draft.phone}
          placeholder="11 4455 6677"
          onChange={(e) => patch({ phone: e.target.value })}
          hint="Con este número se abre WhatsApp para enviar y para hacer seguimiento."
        />
        <TextInput
          label="Dirección"
          value={draft.address}
          placeholder="Av. Cabildo 2340, 5.º B"
          onChange={(e) => patch({ address: e.target.value })}
        />
        {draft.phone ? (
          <Button
            size="sm"
            onClick={() => openWhatsApp(draft.phone, `Hola ${draft.name.split(' ')[0] || ''}`.trim())}
          >
            Probar WhatsApp
          </Button>
        ) : null}
        {existing && usedIn > 0 ? (
          <p className="text-xs text-muted">
            Tiene {usedIn} presupuesto{usedIn === 1 ? '' : 's'}. Si lo borrás, esos presupuestos
            quedan sin cliente.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
