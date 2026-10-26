/** HERRAMIENTA · Logo del negocio y fotos del trabajo (cámara o galería). */
import { useEffect, useState } from 'react'
import { useLimits } from '../../kit/access'
import { Button, useToast } from '../../kit/ui'
import {
  ImageError,
  LOGO_MAX_SIDE,
  MAX_PHOTOS,
  PHOTO_MAX_SIDE,
  compressImage,
  deleteImage,
  getImage,
  pickImages,
  putImage,
} from '../images'
import { uid } from '../defaults'

/** Carga una imagen de IndexedDB y la mantiene en memoria mientras se ve. */
export function useStoredImage(id: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!id) {
      setSrc(null)
      return
    }
    void getImage(id).then((value) => {
      if (alive) setSrc(value)
    })
    return () => {
      alive = false
    }
  }, [id])
  return src
}

/** Muestra el motivo real del fallo: si no, no hay forma de saber qué pasó. */
const motivo = (e: unknown, fallback: string) =>
  e instanceof ImageError ? e.message : fallback

/* --------------------------------- Logo --------------------------------- */

export function LogoPicker({
  logoId,
  onChange,
}: {
  logoId: string | null
  onChange: (id: string | null) => void
}) {
  const limits = useLimits()
  const toast = useToast()
  const src = useStoredImage(logoId)
  const [busy, setBusy] = useState(false)

  async function choose() {
    if (!limits.canImages) return
    const [file] = await pickImages()
    if (!file) return
    setBusy(true)
    try {
      const { dataUrl } = await compressImage(file, {
        maxSide: LOGO_MAX_SIDE,
        quality: 0.9,
        keepAlpha: true,
      })
      const id = uid()
      await putImage(id, dataUrl)
      if (logoId) void deleteImage(logoId)
      onChange(id)
      toast('Logo guardado.')
    } catch (e) {
      toast(motivo(e, 'No pudimos usar esa imagen. Probá con un JPG o un PNG.'), 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="fl-label">Logo</span>
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
          {src ? (
            <img src={src} alt="Logo del negocio" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-2xl" aria-hidden="true">
              🏷️
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void choose()}
            disabled={busy || !limits.canImages}
            title={limits.canImages ? undefined : 'Disponible en la versión completa'}
          >
            {busy ? 'Guardando…' : src ? 'Cambiar' : 'Subir logo'}
          </Button>
          {src ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (logoId) void deleteImage(logoId)
                onChange(null)
              }}
            >
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        {limits.canImages
          ? 'Se comprime solo y sale en el PDF, arriba a la izquierda. JPG o PNG.'
          : 'En la demo no se puede subir el logo: el PDF sale sin él. Con la versión completa, sí.'}
      </p>
    </div>
  )
}

/* --------------------------------- Fotos --------------------------------- */

export function PhotoStrip({
  photoIds,
  onChange,
}: {
  photoIds: string[]
  onChange: (ids: string[]) => void
}) {
  const limits = useLimits()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const full = photoIds.length >= MAX_PHOTOS

  async function add() {
    if (!limits.canImages) return
    if (full) {
      toast(`Hasta ${MAX_PHOTOS} fotos por presupuesto.`, 'danger')
      return
    }
    const files = await pickImages(true)
    if (!files.length) return
    setBusy(true)
    const next = [...photoIds]
    try {
      for (const file of files.slice(0, MAX_PHOTOS - photoIds.length)) {
        const { dataUrl } = await compressImage(file, { maxSide: PHOTO_MAX_SIDE })
        const id = uid()
        await putImage(id, dataUrl)
        next.push(id)
      }
      onChange(next)
      toast(next.length - photoIds.length === 1 ? 'Foto agregada.' : 'Fotos agregadas.')
    } catch (e) {
      // Lo que se alcanzó a guardar antes del error no se pierde.
      if (next.length > photoIds.length) onChange(next)
      toast(motivo(e, 'No pudimos guardar esa foto.'), 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="fl-label mb-0">
          Fotos del trabajo{' '}
          <span className="font-normal text-muted">
            ({photoIds.length}/{MAX_PHOTOS})
          </span>
        </span>
        <Button
          size="sm"
          onClick={() => void add()}
          disabled={busy || full || !limits.canImages}
          title={limits.canImages ? undefined : 'Disponible en la versión completa'}
        >
          {busy ? 'Guardando…' : '+ Foto'}
        </Button>
      </div>
      {photoIds.length === 0 ? (
        <p className="text-xs text-muted">
          {limits.canImages
            ? 'Sacá una foto del problema o del trabajo terminado: van al final del PDF.'
            : 'En la demo no se pueden agregar fotos. Con la versión completa, sí.'}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photoIds.map((id, i) => (
            <li key={id} className="relative">
              <Thumb id={id} index={i + 1} />
              <button
                type="button"
                aria-label={`Quitar foto ${i + 1}`}
                onClick={() => {
                  void deleteImage(id)
                  onChange(photoIds.filter((p) => p !== id))
                }}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Thumb({ id, index }: { id: string; index: number }) {
  const src = useStoredImage(id)
  return (
    <div className="aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
      {src ? (
        <img src={src} alt={`Foto ${index} del trabajo`} className="size-full object-cover" />
      ) : null}
    </div>
  )
}
