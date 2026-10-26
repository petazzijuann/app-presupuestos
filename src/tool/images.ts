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

/** Error con un mensaje que se le puede mostrar al usuario tal cual. */
export class ImageError extends Error {}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(
          new ImageError(
            'Este navegador no puede guardar imágenes. Si estás en una ventana privada, ' +
              'abrí la app en una normal.'
          )
        )
        return
      }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () =>
        reject(
          new ImageError(
            'No pudimos abrir el almacén de imágenes. Suele pasar en ventanas privadas: ' +
              'abrí la app en una pestaña normal.'
          )
        )
      // Safari puede dejar la apertura colgada si hay otra pestaña bloqueándola.
      req.onblocked = () =>
        reject(new ImageError('Cerrá las otras pestañas de la app y volvé a intentar.'))
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

export async function putImage(id: string, dataUrl: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put(dataUrl, id))
  } catch (e) {
    if (e instanceof ImageError) throw e
    const name = e instanceof DOMException ? e.name : ''
    throw new ImageError(
      name === 'QuotaExceededError'
        ? 'No queda espacio en el celular para más imágenes. Borrá alguna foto vieja y probá de nuevo.'
        : 'No pudimos guardar la imagen en este navegador.'
    )
  }
}

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

/**
 * Decodifica el archivo elegido.
 *
 * Primero con `createImageBitmap`, que en el celular entiende más formatos
 * (HEIC en iPhone, AVIF) y no necesita pasar la foto entera a base64. Si no
 * está o falla, se cae al `<img>` de toda la vida con un object URL, que
 * gasta mucha menos memoria que un data URL de 12 megapíxeles.
 */
async function decode(file: Blob): Promise<{
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close(),
        }
      }
      bitmap.close()
    } catch {
      /* formato que este navegador no sabe decodificar así: probamos con <img> */
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () =>
        reject(
          new ImageError(
            'Tu navegador no pudo abrir ese archivo. Si la foto es HEIC (iPhone), ' +
              'sacale una captura de pantalla o guardala como JPG y probá de nuevo.'
          )
        )
      el.src = url
    })
    // Un SVG sin tamaño propio se decodifica en 0×0 y saldría un logo en blanco.
    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height) {
      throw new ImageError(
        'Esa imagen no tiene un tamaño definido. Probá con un PNG o un JPG en vez de un SVG.'
      )
    }
    return { source: img, width, height, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

export type CompressedImage = {
  dataUrl: string
  width: number
  height: number
  /** Tamaño aproximado en bytes del data URL. */
  bytes: number
}

/**
 * Reduce la imagen al lado máximo pedido. Una foto de celular de 4 MB queda en
 * unos 150–250 kB, que es lo que entra en un PDF y en la copia de seguridad sin
 * que pese de más.
 *
 * `keepAlpha` guarda PNG para no perder la transparencia (el logo); el resto va
 * en JPEG, que para una foto pesa una fracción.
 */
export async function compressImage(
  file: File | Blob,
  { maxSide = PHOTO_MAX_SIDE, quality = 0.78, keepAlpha = false } = {}
): Promise<CompressedImage> {
  if (!file.size) throw new ImageError('Ese archivo está vacío.')

  const img = await decode(file)
  try {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageError('Este navegador no puede achicar imágenes.')

    // Solo tiene sentido conservar alfa si el archivo de origen lo trae.
    const alpha = keepAlpha && /png|webp|gif|svg/i.test((file as File).type || '')
    if (!alpha) {
      // Fondo blanco: un PNG transparente pasado a JPEG queda negro.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(img.source, 0, 0, width, height)

    const dataUrl = alpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality)
    // En iOS un canvas demasiado grande sale en blanco y toDataURL devuelve casi nada.
    if (!dataUrl.startsWith('data:image/') || dataUrl.length < 128) {
      throw new ImageError('No pudimos procesar esa imagen. Probá con una foto más chica.')
    }
    return { dataUrl, width, height, bytes: Math.round((dataUrl.length * 3) / 4) }
  } finally {
    img.close()
  }
}

/**
 * Abre la cámara o la galería y devuelve los archivos elegidos.
 *
 * El input va adjunto al documento a propósito: en Safari de iPhone y en varios
 * navegadores Android un input suelto no dispara `change`, así que el usuario
 * elegía la foto y no pasaba nada.
 */
export function pickImages(multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    // Fuera de la vista, pero dentro del documento.
    input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
    document.body.appendChild(input)

    let done = false
    const finish = (files: File[]) => {
      if (done) return
      done = true
      window.removeEventListener('focus', onFocus)
      input.remove()
      resolve(files)
    }

    // Respaldo de cancelación: `oncancel` no existe en todos los navegadores y
    // sin esto la promesa quedaba colgada para siempre. Se leen igual los
    // archivos por si el `change` llega después del `focus`; el margen es para
    // los que vienen de Drive o de la nube y tardan en materializarse.
    function onFocus() {
      setTimeout(() => finish(Array.from(input.files ?? [])), 2500)
    }

    input.onchange = () => finish(Array.from(input.files ?? []))
    input.oncancel = () => finish([])
    window.addEventListener('focus', onFocus, { once: true })
    input.click()
  })
}
