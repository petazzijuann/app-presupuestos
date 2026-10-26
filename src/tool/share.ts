/**
 * HERRAMIENTA · Salidas: compartir el PDF, abrir WhatsApp y copiar el resumen.
 *
 * En el celular lo que sirve de verdad es la Web Share API con el archivo
 * adentro (se manda por WhatsApp como documento). Cuando no se puede, se
 * descarga el PDF y se abre wa.me con el texto listo.
 */
import { formatDate as dmy, quoteTotals, validUntil } from './calc'
import { formatMoney, type CurrencyCode } from './money'
import { unitShort } from './trades'
import type { Business, Client, Quote } from './types'

/* ------------------------------- Teléfonos ------------------------------- */

/**
 * Deja el teléfono como lo quiere wa.me: solo dígitos, con el código de país.
 * Si el número viene en formato local argentino (sin país), le pone el 54.
 */
export function waNumber(phone: string, defaultCountry = '54'): string {
  let digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  digits = digits.replace(/^0+/, '')
  if (digits.length <= 11 && !digits.startsWith(defaultCountry)) digits = defaultCountry + digits
  return digits
}

export function waLink(phone: string, text: string): string {
  const number = waNumber(phone)
  const query = `?text=${encodeURIComponent(text)}`
  return number ? `https://wa.me/${number}${query}` : `https://wa.me/${query}`
}

/** Abre WhatsApp en una pestaña nueva (en el celular, la app). */
export function openWhatsApp(phone: string, text: string) {
  window.open(waLink(phone, text), '_blank', 'noopener')
}

/* --------------------------------- Textos --------------------------------- */

const firstName = (name: string) => (name || '').trim().split(/\s+/)[0] || ''

/** Resumen con formato de WhatsApp (*negrita*), listo para pegar. */
export function quoteSummaryText(
  quote: Quote,
  business: Business,
  client: Client | null,
  currency: CurrencyCode
): string {
  const money = (n: number) => formatMoney(n, currency)
  const t = quoteTotals(quote)
  const qty = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

  const out: string[] = []
  out.push(`*${business.name || 'Presupuesto'}*`)
  out.push(`Presupuesto *${quote.number}* · ${dmy(quote.date)}`)
  if (client?.name) out.push(`Cliente: ${client.name}`)
  if (quote.address) out.push(`Obra: ${quote.address}`)
  out.push('')
  if (quote.description) {
    out.push(quote.description)
    out.push('')
  }

  const groups: [string, 'obra' | 'material'][] = [
    ['Mano de obra', 'obra'],
    ['Materiales', 'material'],
  ]
  for (const [label, kind] of groups) {
    const rows = quote.lines.filter((l) => l.kind === kind)
    if (!rows.length) continue
    out.push(`*${label}*`)
    for (const l of rows) {
      out.push(
        `• ${l.name || 'Ítem'} — ${qty.format(l.qty)} ${unitShort(l.unit)} × ${money(
          l.price
        )} = ${money(l.qty * l.price)}`
      )
    }
    out.push('')
  }

  if (t.discount > 0) out.push(`Subtotal: ${money(t.subtotal)}`)
  if (t.discount > 0) out.push(`Descuento: -${money(t.discount)}`)
  if (t.vat > 0) out.push(`IVA ${quote.vatPercent} %: ${money(t.vat)}`)
  out.push(`*TOTAL: ${money(t.total)}*`)
  if (t.deposit > 0) {
    out.push(`Seña (${quote.depositPercent} %): ${money(t.deposit)}`)
    out.push(`Saldo contra entrega: ${money(t.balance)}`)
  }
  out.push('')
  if (quote.leadTime) out.push(`Plazo: ${quote.leadTime}`)
  if (quote.payment) out.push(`Pago: ${quote.payment}`)
  if (quote.warranty) out.push(`Garantía: ${quote.warranty}`)
  if (quote.notes) out.push(quote.notes)
  out.push(`Válido hasta el ${dmy(validUntil(quote.date, quote.validityDays))}.`)
  if (business.phone) out.push(`Cualquier duda, escribime: ${business.phone}`)

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Mensaje corto que acompaña al PDF. */
export function sendMessage(
  quote: Quote,
  business: Business,
  client: Client | null,
  currency: CurrencyCode
): string {
  const hola = client?.name ? `Hola ${firstName(client.name)}` : 'Hola'
  const total = formatMoney(quoteTotals(quote).total, currency)
  const firma = business.name ? ` — ${business.name}` : ''
  return (
    `${hola}, te envío el presupuesto ${quote.number} por ${total}. ` +
    `Tiene validez hasta el ${dmy(validUntil(quote.date, quote.validityDays))}. ` +
    `Cualquier duda me escribís y lo vemos${firma}.`
  )
}

/** Mensaje amable de seguimiento, a los 3 días de enviado. */
export function followUpMessage(
  quote: Quote,
  business: Business,
  client: Client | null,
  currency: CurrencyCode
): string {
  const hola = client?.name ? `Hola ${firstName(client.name)}` : 'Hola'
  const total = formatMoney(quoteTotals(quote).total, currency)
  const firma = business.name ? ` ${business.name}` : ''
  return (
    `${hola}, ¿cómo estás? Te escribo de${firma} por el presupuesto ${quote.number} ` +
    `por ${total} que te pasé hace unos días. ` +
    `Quería saber si te quedó alguna duda o si querés que lo ajustemos. ` +
    `Sigo a disposición. ¡Gracias!`
  )
}

/* ------------------------------- Compartir ------------------------------- */

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** true si el navegador puede compartir el archivo PDF (celulares modernos). */
export function canShareFile(blob: Blob, fileName: string): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
    const file = new File([blob], fileName, { type: 'application/pdf' })
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Comparte el PDF. Si el navegador no sabe compartir archivos (o el usuario
 * está en la demo), lo descarga y deja que el llamador abra WhatsApp.
 */
export async function sharePdf(
  blob: Blob,
  fileName: string,
  title: string,
  text: string,
  allowed = true
): Promise<ShareOutcome> {
  if (allowed && canShareFile(blob, fileName)) {
    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: 'application/pdf' })],
        title,
        text,
      })
      return 'shared'
    } catch (e) {
      // AbortError = el usuario cerró la hoja de compartir: no es un error.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  downloadBlob(blob, fileName)
  return 'downloaded'
}

/** Copia texto al portapapeles, con respaldo para navegadores viejos. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
