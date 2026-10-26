/** KIT · Exportar / importar los datos del usuario como .json */
import { config } from '../config'
import { key, readJSON, writeJSON } from './storage'

/** Claves que NO viajan en la copia: son propias del dispositivo. */
const DEVICE_ONLY = new Set(['license', 'theme', 'ui', 'lastExportAt', 'iosHintDismissed'])

export type BackupFile = {
  app: string
  version: number
  exportedAt: string
  data: Record<string, unknown>
  /**
   * Binarios que no viven en localStorage (imágenes de IndexedDB), guardados
   * como data URL en base64. Los aporta la herramienta con `registerBackupExtra`.
   */
  files?: Record<string, string>
}

/**
 * Enganche opcional para que la herramienta sume sus propios datos a la copia
 * (en esta app: el logo y las fotos guardadas en IndexedDB). El kit no sabe
 * qué hay adentro: solo lo guarda y lo devuelve.
 */
export type BackupExtra = {
  collect: () => Promise<Record<string, string>>
  restore: (files: Record<string, string>) => Promise<void>
}

let extra: BackupExtra | null = null

export function registerBackupExtra(e: BackupExtra | null) {
  extra = e
}

const prefix = `${config.storagePrefix}.`

/** Copia solo con lo que vive en localStorage (sincrónica). */
export function buildBackup(): BackupFile {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i)
    if (!full || !full.startsWith(prefix)) continue
    const name = full.slice(prefix.length)
    if (DEVICE_ONLY.has(name)) continue
    try {
      data[name] = JSON.parse(localStorage.getItem(full) as string)
    } catch {
      /* clave corrupta: se omite */
    }
  }
  return {
    app: config.storagePrefix,
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** Copia completa: localStorage + las imágenes que aporte la herramienta. */
export async function buildFullBackup(): Promise<BackupFile> {
  const base = buildBackup()
  if (!extra) return base
  try {
    const files = await extra.collect()
    if (Object.keys(files).length) return { ...base, files }
  } catch {
    /* si las imágenes fallan, la copia de los datos igual sirve */
  }
  return base
}

export function fileName() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${config.appName.toLowerCase()}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(
    d.getDate()
  )}.json`
}

/** Descarga la copia completa y devuelve el tamaño en bytes (para avisar si pesa). */
export async function downloadBackup(): Promise<number> {
  const blob = new Blob([JSON.stringify(await buildFullBackup(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  markExported()
  return blob.size
}

/** Tamaño legible, para el aviso de "la copia quedó pesada". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}

/** Desde cuántos bytes conviene avisar que el archivo quedó grande. */
export const HEAVY_BACKUP_BYTES = 4_000_000

export class ImportError extends Error {}

/** Lee un archivo .json y lo escribe en localStorage. Devuelve cuántas claves importó. */
export async function importBackupFile(file: File): Promise<number> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new ImportError('El archivo no es un .json válido.')
  }
  const backup = parsed as Partial<BackupFile>
  if (!backup || typeof backup !== 'object' || typeof backup.data !== 'object' || !backup.data) {
    throw new ImportError('El archivo no parece una copia de esta app.')
  }
  if (backup.app && backup.app !== config.storagePrefix) {
    throw new ImportError(`Esa copia es de otra app (${String(backup.app)}).`)
  }
  let count = 0
  for (const [name, value] of Object.entries(backup.data)) {
    if (DEVICE_ONLY.has(name)) continue
    if (writeJSON(name, value)) count++
  }
  if (count === 0) throw new ImportError('La copia no tenía datos para importar.')
  if (extra && backup.files && typeof backup.files === 'object') {
    try {
      await extra.restore(backup.files as Record<string, string>)
      count++
    } catch {
      throw new ImportError('Importamos los datos, pero no pudimos guardar las imágenes.')
    }
  }
  return count
}

/** Abre el selector de archivos y devuelve el elegido. */
export function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/* ------------------------ Recordatorio de copia ------------------------ */

export function markExported() {
  writeJSON('lastExportAt', Date.now())
}

export function daysSinceExport(): number | null {
  const t = readJSON<number | null>('lastExportAt', null)
  if (!t) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

/** true si hay que recordarle al usuario hacer una copia. */
export function shouldRemindBackup(hasData: boolean): boolean {
  if (!hasData) return false
  const days = daysSinceExport()
  if (days === null) {
    // Nunca exportó: recordamos recién cuando la instalación tiene cierta antigüedad.
    const since = readJSON<number | null>('firstUseAt', null)
    if (!since) {
      writeJSON('firstUseAt', Date.now())
      return false
    }
    return Date.now() - since > config.backupReminderDays * 86_400_000
  }
  return days >= config.backupReminderDays
}

export const storageKeyOf = key
