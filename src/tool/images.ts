/**
 * HERRAMIENTA · Logo y fotos del trabajo.
 *
 * Las imágenes NO van en localStorage (se llenaría la cuota en dos fotos):
 * viven en IndexedDB, comprimidas a ~1200 px y guardadas como data URL para
 * que el PDF y la copia de seguridad las puedan usar sin convertir nada.
 */
import { config } from '../config'

const DB_NAME = `${config.storagePrefix}.images`
const STORE = 'images'

/** Lado más largo de las fotos del trabajo. */
export const PHOTO_MAX_SIDE = 1200
/** El logo entra chico en el PDF: no hace falta más que esto. */
export const LOGO_MAX_SIDE = 480
/** Tope de fotos por presupuesto. */
export const MAX_PHOTOS = 3

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Este navegador no guarda imágenes.'))
        return
      }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('No pudimos abrir el almacén de imágenes.'))
    })
    // Si falla, se olvida la promesa para poder reintentar en el próximo uso.
    dbPromise = opening.catch((e: unknown) => {
      dbPromise = null
      throw e
    })
  }
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Error de almacenamiento.'))
      })
  )
}

export const putImage = (id: string, dataUrl: string): Promise<unknown> =>
  tx('readwrite', (s) => s.put(dataUrl, id))

export async function getImage(id: string): Promise<string | null> {
  try {
    const value = await tx<unknown>('readonly', (s) => s.get(id))
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export async function getImages(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const id of ids) {
    const value = await getImage(id)
    if (value) out[id] = value
  }
  return out
}

export async function deleteImage(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* si no se pudo borrar, queda un huérfano: no rompe nada */
  }
}

/** Todas las imágenes guardadas, para la copia de seguridad. */
export async function allImages(): Promise<Record<string, string>> {
  try {
    const db = await openDB()
    return await new Promise<Record<string, string>>((resolve, reject) => {
      const out: Record<string, string> = {}
      const t = db.transaction(STORE, 'readonly')
      const req = t.objectStore(STORE).openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return resolve(out)
        if (typeof cursor.value === 'string') out[String(cursor.key)] = cursor.value
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('Error de almacenamiento.'))
    })
  } catch {
    return {}
  }
}

/** Restaura las imágenes de una copia (sin borrar las que ya había). */
export async function restoreImages(files: Record<string, string>): Promise<number> {
  let count = 0
  for (const [id, dataUrl] of Object.entries(files)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue
    await putImage(id, dataUrl)
    count++
  }
  return count
}

/** Borra las imágenes que ya no referencia ningún presupuesto ni el negocio. */
export async function pruneImages(keep: string[]): Promise<void> {
  const alive = new Set(keep)
  const stored = await allImages()
  for (const id of Object.keys(stored)) {
    if (!alive.has(id)) await deleteImage(id)
  }
}

/* ----------------------------- Compresión ----------------------------- */

const readAsDataURL = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer la imagen.'))
    reader.readAsDataURL(file)
  })

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('El archivo no parece una imagen.'))
    img.src = src
  })

export type CompressedImage = {
  dataUrl: string
  width: number
  height: number
  /** Tamaño aproximado en bytes del data URL. */
  bytes: number
}

/**
 * Reduce la foto al lado máximo pedido y la pasa a JPEG. Una foto de celular
 * de 4 MB queda en unos 150–250 kB, que es lo que entra en un PDF y en la
 * copia de seguridad sin que pese de más.
 */
export async function compressImage(
  file: File | Blob,
  maxSide = PHOTO_MAX_SIDE,
  quality = 0.78
): Promise<CompressedImage> {
  const original = await readAsDataURL(file)
  const img = await loadImage(original)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Este navegador no puede comprimir imágenes.')

  const transparent = /^data:image\/(png|webp|gif|svg)/i.test(original)
  const keepAlpha = transparent && maxSide === LOGO_MAX_SIDE
  if (!keepAlpha) {
    // Fondo blanco: un PNG transparente pasado a JPEG queda negro.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)

  // El logo conserva PNG para no perder la transparencia; las fotos van en JPEG.
  const dataUrl = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality)
  return { dataUrl, width, height, bytes: Math.round((dataUrl.length * 3) / 4) }
}

/** Abre la cámara o la galería y devuelve los archivos elegidos. */
export function pickImages(multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.oncancel = () => resolve([])
    input.click()
  })
}
