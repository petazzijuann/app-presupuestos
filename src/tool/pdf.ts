/**
 * HERRAMIENTA · PDF A4 generado en el celular, sin servidor.
 *
 * jsPDF se carga con `import()` dinámico: la app abre liviana (importa en la
 * obra, con mala señal) y la librería baja recién cuando se pide un PDF.
 * Las fuentes son las internas de jsPDF (Helvetica, WinAnsi): acentos, ñ, ², °
 * y los símbolos de moneda latinos salen bien sin embeber nada.
 */
import type { jsPDF } from 'jspdf'
import { formatDate as dmy, quoteTotals, validUntil } from './calc'
import { formatMoney, type CurrencyCode } from './money'
import { unitShort } from './trades'
import type { Business, Client, Quote } from './types'

/* ------------------------------ Constantes ------------------------------ */

const PAGE = { w: 210, h: 297 }
const M = 14 // margen
const CONTENT_W = PAGE.w - M * 2
const FOOT_Y = PAGE.h - 12

const INK: [number, number, number] = [11, 23, 54]
const MUTED: [number, number, number] = [92, 104, 125]
const LINE: [number, number, number] = [214, 221, 232]
const ACCENT: [number, number, number] = [178, 81, 11]
const SOFT: [number, number, number] = [248, 240, 232]

/** Columnas de la tabla de ítems (x acumulada desde el margen). */
const COL = {
  detail: M,
  qty: M + 104,
  unit: M + 122,
  price: M + 146,
  amount: PAGE.w - M,
}

export type PdfKind = 'presupuesto' | 'comprobante'

export type PdfInput = {
  quote: Quote
  business: Business
  client: Client | null
  /** Logo en data URL, ya comprimido. */
  logo?: string | null
  /** Fotos en data URL, en el orden de `quote.photoIds`. */
  photos?: string[]
  /** Texto de la marca de agua diagonal (modo demo). */
  watermark?: string | null
}

export type PdfResult = {
  blob: Blob
  fileName: string
  url: string
}

/* ------------------------------- Utilidades ------------------------------- */

const safeFileName = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'presupuesto'

/** Mide la imagen para encajarla en una caja sin deformarla. */
function fit(
  dataUrl: string,
  boxW: number,
  boxH: number
): Promise<{ w: number; h: number; format: string }> {
  return new Promise((resolve) => {
    const format = /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG'
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight)
      resolve({ w: img.naturalWidth * scale, h: img.naturalHeight * scale, format })
    }
    img.onerror = () => resolve({ w: 0, h: 0, format })
    img.src = dataUrl
  })
}

/* ------------------------------ Dibujo base ------------------------------ */

type Ctx = {
  doc: jsPDF
  /** Cursor vertical. */
  y: number
  money: (n: number) => string
  input: PdfInput
  kind: PdfKind
  title: string
  quoteNumber: string
  validThrough: string
}

const setText = (doc: jsPDF, color: [number, number, number], size: number, bold = false) => {
  doc.setTextColor(...color)
  doc.setFontSize(size)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
}

/** Pie en todas las páginas: validez, negocio y número de página. */
function drawFooters(ctx: Ctx) {
  const { doc } = ctx
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(M, FOOT_Y - 4, PAGE.w - M, FOOT_Y - 4)
    setText(doc, MUTED, 7.5)
    doc.text(ctx.validThrough, M, FOOT_Y)
    doc.text(`Página ${p} de ${total}`, PAGE.w - M, FOOT_Y, { align: 'right' })
    const name = ctx.input.business.name || 'Presupuestos'
    doc.text(name, PAGE.w / 2, FOOT_Y, { align: 'center', maxWidth: CONTENT_W * 0.4 })
  }
  doc.setPage(total)
}

/** Marca de agua diagonal de la demo, en todas las páginas. */
function drawWatermark(doc: jsPDF, text: string) {
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.saveGraphicsState()
    // @ts-expect-error — GState existe en runtime; los tipos no lo exponen.
    doc.setGState(new doc.GState({ opacity: 0.12 }))
    doc.setTextColor(11, 23, 54)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(34)
    doc.text(text, PAGE.w / 2, PAGE.h / 2, { align: 'center', angle: 32 })
    doc.restoreGraphicsState()
  }
  doc.setPage(total)
}

/** Salto de página cuando no queda lugar; devuelve la y nueva. */
function ensure(ctx: Ctx, needed: number): number {
  if (ctx.y + needed > FOOT_Y - 8) {
    ctx.doc.addPage()
    ctx.y = M
  }
  return ctx.y
}

function sectionTitle(ctx: Ctx, text: string) {
  ensure(ctx, 12)
  setText(ctx.doc, ACCENT, 9, true)
  ctx.doc.text(text.toUpperCase(), M, ctx.y)
  ctx.y += 2
  ctx.doc.setDrawColor(...ACCENT)
  ctx.doc.setLineWidth(0.4)
  ctx.doc.line(M, ctx.y, PAGE.w - M, ctx.y)
  ctx.y += 5
}

/** Párrafo con corte de línea automático. */
function paragraph(ctx: Ctx, text: string, size = 9.5, color = INK) {
  if (!text?.trim()) return
  setText(ctx.doc, color as [number, number, number], size)
  const lines = ctx.doc.splitTextToSize(text.trim(), CONTENT_W) as string[]
  for (const line of lines) {
    ensure(ctx, 6)
    ctx.doc.text(line, M, ctx.y)
    ctx.y += size * 0.45 + 1.2
  }
}

/* -------------------------------- Encabezado -------------------------------- */

async function drawHeader(ctx: Ctx) {
  const { doc, input } = ctx
  const { business } = input
  const top = M
  let textLeft = M
  let logoBottom = top

  if (input.logo) {
    const box = await fit(input.logo, 26, 20)
    if (box.w > 0) {
      try {
        doc.addImage(input.logo, box.format, M, top, box.w, box.h)
        textLeft = M + box.w + 5
        logoBottom = top + box.h
      } catch {
        /* imagen ilegible: seguimos sin logo */
      }
    }
  }

  setText(doc, INK, 15, true)
  doc.text(business.name || 'Mi negocio', textLeft, top + 6, { maxWidth: CONTENT_W * 0.52 })

  const meta = [
    business.area,
    business.phone ? `Tel. / WhatsApp: ${business.phone}` : '',
    business.email,
    business.taxId ? `CUIT / Id. fiscal: ${business.taxId}` : '',
  ].filter(Boolean)

  setText(doc, MUTED, 8)
  let my = top + 3
  for (const row of meta.slice(0, 4)) {
    doc.text(row, PAGE.w - M, my, { align: 'right', maxWidth: CONTENT_W * 0.42 })
    my += 4
  }

  ctx.y = Math.max(logoBottom + 4, top + 12, my + 3)

  // Banda con el título y el número.
  doc.setFillColor(...SOFT)
  doc.rect(M, ctx.y, CONTENT_W, 13, 'F')
  setText(doc, INK, 12, true)
  doc.text(ctx.title.toUpperCase(), M + 3, ctx.y + 8.6)
  setText(doc, ACCENT, 12, true)
  doc.text(ctx.quoteNumber, PAGE.w - M - 3, ctx.y + 8.6, { align: 'right' })
  ctx.y += 18
}

/* --------------------------------- Datos --------------------------------- */

function drawParties(ctx: Ctx) {
  const { doc, input } = ctx
  const { quote, client } = input
  const half = (CONTENT_W - 6) / 2
  // En el comprobante el trabajo ya se hizo: la validez no viene al caso.
  const isReceipt = ctx.kind === 'comprobante'

  const left = [
    ['Cliente', client?.name || 'Sin cliente asignado'],
    ...(client?.phone ? [['Teléfono', client.phone]] : []),
    ...(quote.address || client?.address
      ? [['Dirección de la obra', quote.address || client?.address || '']]
      : []),
  ]
  const right = [
    [isReceipt ? 'Fecha del trabajo' : 'Fecha', dmy(quote.date)],
    ...(isReceipt
      ? []
      : [
          [
            'Validez',
            `${quote.validityDays} días (hasta el ${dmy(
              validUntil(quote.date, quote.validityDays)
            )})`,
          ],
        ]),
    ...(quote.leadTime && !isReceipt ? [['Plazo de ejecución', quote.leadTime]] : []),
  ]

  const startY = ctx.y
  const column = (rows: string[][], x: number): number => {
    let y = startY
    for (const [label, value] of rows) {
      setText(doc, MUTED, 7.5, true)
      doc.text(label.toUpperCase(), x, y)
      y += 3.8
      setText(doc, INK, 9.5)
      const lines = doc.splitTextToSize(value, half) as string[]
      for (const l of lines.slice(0, 3)) {
        doc.text(l, x, y)
        y += 4.4
      }
      y += 1.6
    }
    return y
  }

  const endLeft = column(left, M)
  const endRight = column(right, M + half + 6)
  ctx.y = Math.max(endLeft, endRight) + 2

  if (quote.description?.trim()) {
    sectionTitle(ctx, isReceipt ? 'Trabajo realizado' : 'Trabajo a realizar')
    paragraph(ctx, quote.description)
    ctx.y += 2
  }
}

/* ------------------------------ Tabla de ítems ------------------------------ */

function tableHead(ctx: Ctx) {
  const { doc } = ctx
  ensure(ctx, 14)
  doc.setFillColor(...SOFT)
  doc.rect(M, ctx.y - 4, CONTENT_W, 7, 'F')
  setText(doc, INK, 7.5, true)
  doc.text('ÍTEM', COL.detail + 1, ctx.y)
  doc.text('CANT.', COL.qty, ctx.y, { align: 'right' })
  doc.text('UNIDAD', COL.unit, ctx.y, { align: 'right' })
  doc.text('P. UNIT.', COL.price, ctx.y, { align: 'right' })
  doc.text('IMPORTE', COL.amount - 1, ctx.y, { align: 'right' })
  ctx.y += 6
}

function drawLines(ctx: Ctx) {
  const { doc, input } = ctx
  const groups: { label: string; kind: 'obra' | 'material' }[] = [
    { label: 'Mano de obra', kind: 'obra' },
    { label: 'Materiales', kind: 'material' },
  ]

  sectionTitle(ctx, 'Detalle')
  tableHead(ctx)

  const qtyFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

  for (const group of groups) {
    const rows = input.quote.lines.filter((l) => l.kind === group.kind)
    if (!rows.length) continue

    ensure(ctx, 10)
    setText(doc, MUTED, 8, true)
    doc.text(group.label.toUpperCase(), COL.detail + 1, ctx.y)
    ctx.y += 4.5

    for (const line of rows) {
      const name = doc.splitTextToSize(line.name || 'Ítem', COL.qty - M - 6) as string[]
      const height = Math.max(5.2, name.length * 4.2 + 1)
      if (ctx.y + height > FOOT_Y - 8) {
        doc.addPage()
        ctx.y = M
        tableHead(ctx)
      }
      setText(doc, INK, 9)
      name.forEach((l, i) => doc.text(l, COL.detail + 1, ctx.y + i * 4.2))
      doc.text(qtyFmt.format(line.qty), COL.qty, ctx.y, { align: 'right' })
      setText(doc, MUTED, 8.5)
      doc.text(unitShort(line.unit), COL.unit, ctx.y, { align: 'right' })
      setText(doc, INK, 9)
      doc.text(ctx.money(line.price), COL.price, ctx.y, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text(ctx.money(line.qty * line.price), COL.amount - 1, ctx.y, { align: 'right' })

      ctx.y += height
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.1)
      doc.line(M, ctx.y - 2.4, PAGE.w - M, ctx.y - 2.4)
    }
    ctx.y += 2
  }
}

/* --------------------------------- Totales --------------------------------- */

function drawTotals(ctx: Ctx) {
  const { doc, input } = ctx
  const t = quoteTotals(input.quote)
  const isReceipt = ctx.kind === 'comprobante'

  const rows: [string, string, boolean?][] = []
  if (t.labor > 0 && t.materials > 0) {
    rows.push(['Subtotal mano de obra', ctx.money(t.labor)])
    rows.push(['Subtotal materiales', ctx.money(t.materials)])
  }
  rows.push(['Subtotal', ctx.money(t.subtotal)])
  if (t.discount > 0) {
    const label =
      input.quote.discountKind === 'percent'
        ? `Descuento (${input.quote.discountValue} %)`
        : 'Descuento'
    rows.push([label, `- ${ctx.money(t.discount)}`])
  }
  if (t.vat > 0) {
    rows.push(['Neto', ctx.money(t.net)])
    rows.push([`IVA ${input.quote.vatPercent} %`, ctx.money(t.vat)])
  }
  rows.push([isReceipt ? 'Total del trabajo' : 'TOTAL', ctx.money(t.total), true])
  if (isReceipt) {
    const collected = input.quote.collected ?? t.total
    rows.push(['Cobrado', ctx.money(collected), true])
    if (Math.abs(collected - t.total) > 0.005) {
      rows.push(['Saldo pendiente', ctx.money(t.total - collected)])
    }
  } else if (t.deposit > 0) {
    rows.push([`Seña (${input.quote.depositPercent} %)`, ctx.money(t.deposit)])
    rows.push(['Saldo contra entrega', ctx.money(t.balance)])
  }

  const boxW = 86
  const boxX = PAGE.w - M - boxW
  const boxH = rows.length * 5.6 + 6
  ensure(ctx, boxH + 4)

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, ctx.y, boxW, boxH, 2, 2, 'S')

  let y = ctx.y + 6.5
  for (const [label, value, strong] of rows) {
    if (strong) {
      doc.setFillColor(...SOFT)
      doc.rect(boxX + 0.6, y - 4.2, boxW - 1.2, 5.6, 'F')
    }
    setText(doc, strong ? INK : MUTED, strong ? 10 : 8.5, !!strong)
    doc.text(label, boxX + 3, y)
    doc.setTextColor(...INK)
    doc.text(value, boxX + boxW - 3, y, { align: 'right' })
    y += 5.6
  }
  ctx.y += boxH + 6
}

/* -------------------------------- Condiciones -------------------------------- */

function drawTerms(ctx: Ctx) {
  const { quote, business } = ctx.input
  // El plazo de ejecución ya sale arriba, junto a la fecha: no se repite acá.
  const rows: [string, string][] = [
    ['Forma de pago', quote.payment],
    ['Garantía', quote.warranty],
    ['Notas', quote.notes],
  ].filter(([, v]) => v?.trim()) as [string, string][]

  if (!rows.length && !business.terms.footer?.trim()) return
  sectionTitle(ctx, 'Condiciones')

  for (const [label, value] of rows) {
    ensure(ctx, 8)
    setText(ctx.doc, MUTED, 7.5, true)
    ctx.doc.text(label.toUpperCase(), M, ctx.y)
    ctx.y += 3.8
    paragraph(ctx, value, 9)
    ctx.y += 1.5
  }
  if (business.terms.footer?.trim()) {
    ctx.y += 1
    paragraph(ctx, business.terms.footer, 8, MUTED)
  }
}

/* ---------------------------------- Fotos ---------------------------------- */

async function drawPhotos(ctx: Ctx) {
  const photos = ctx.input.photos ?? []
  if (!photos.length) return

  ctx.doc.addPage()
  ctx.y = M
  sectionTitle(ctx, photos.length === 1 ? 'Foto del trabajo' : 'Fotos del trabajo')

  const boxW = CONTENT_W
  const boxH = (FOOT_Y - 10 - ctx.y) / Math.min(photos.length, 2) - 6

  for (const photo of photos) {
    const box = await fit(photo, boxW, Math.max(50, boxH))
    if (box.w <= 0) continue
    if (ctx.y + box.h > FOOT_Y - 8) {
      ctx.doc.addPage()
      ctx.y = M
    }
    try {
      ctx.doc.addImage(photo, box.format, M + (boxW - box.w) / 2, ctx.y, box.w, box.h)
      ctx.y += box.h + 6
    } catch {
      /* foto ilegible: la salteamos */
    }
  }
}

/* ------------------------------ Documento ------------------------------ */

async function render(input: PdfInput, kind: PdfKind): Promise<PdfResult> {
  const { jsPDF: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true })
  const currency: CurrencyCode = input.business.currency

  const ctx: Ctx = {
    doc,
    y: M,
    money: (n: number) => formatMoney(n, currency),
    input,
    kind,
    title: kind === 'comprobante' ? 'Comprobante de trabajo' : 'Presupuesto',
    quoteNumber: input.quote.number,
    validThrough:
      kind === 'comprobante'
        ? 'Documento no válido como factura.'
        : `Presupuesto válido hasta el ${dmy(
            validUntil(input.quote.date, input.quote.validityDays)
          )}.`,
  }

  doc.setProperties({
    title: `${ctx.title} ${input.quote.number}`,
    subject: input.quote.description || ctx.title,
    author: input.business.name || 'Futurislabs Presupuestos',
    creator: 'Futurislabs Presupuestos',
  })

  await drawHeader(ctx)
  drawParties(ctx)

  if (kind === 'comprobante') {
    ensure(ctx, 14)
    doc.setFillColor(...SOFT)
    doc.rect(M, ctx.y - 4, CONTENT_W, 10, 'F')
    setText(doc, INK, 9, true)
    doc.text('DOCUMENTO NO VÁLIDO COMO FACTURA', PAGE.w / 2, ctx.y + 2.4, { align: 'center' })
    ctx.y += 12
  }

  drawLines(ctx)
  drawTotals(ctx)
  drawTerms(ctx)

  if (kind === 'comprobante') {
    ctx.y += 2
    ensure(ctx, 18)
    setText(doc, MUTED, 8)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.line(M, ctx.y + 10, M + 70, ctx.y + 10)
    doc.text('Firma y aclaración del cliente', M, ctx.y + 13.5)
    doc.line(PAGE.w - M - 70, ctx.y + 10, PAGE.w - M, ctx.y + 10)
    doc.text('Firma del responsable', PAGE.w - M - 70, ctx.y + 13.5)
    ctx.y += 16
  }

  await drawPhotos(ctx)
  drawFooters(ctx)
  if (input.watermark) drawWatermark(doc, input.watermark)

  const blob = doc.output('blob') as Blob
  const prefix = kind === 'comprobante' ? 'comprobante' : 'presupuesto'
  const who = input.client?.name ? `-${safeFileName(input.client.name)}` : ''
  const fileName = `${prefix}-${safeFileName(input.quote.number)}${who}.pdf`
  return { blob, fileName, url: URL.createObjectURL(blob) }
}

export const buildQuotePdf = (input: PdfInput) => render(input, 'presupuesto')
export const buildReceiptPdf = (input: PdfInput) => render(input, 'comprobante')
