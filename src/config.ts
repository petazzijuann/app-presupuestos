/**
 * CONFIGURACIÓN DE LA MICROAPP
 * ----------------------------------------------------------------------
 * Este archivo es el "panel de control" de la plantilla: para crear una
 * microapp nueva alcanza con cambiar estos valores y reemplazar `src/tool/`.
 * Lo que empieza con VITE_ se puede sobreescribir con variables de entorno
 * (archivo .env o panel de Cloudflare Pages) sin tocar el código.
 */

const env = import.meta.env

export const config = {
  /** Nombre comercial de la app (se ve en el header y en los PDF). */
  appName: 'Presupuestos',
  /** Marca paraguas. */
  brand: 'Futurislabs',
  /** Una línea para la pantalla de activación. */
  tagline: 'Presupuestos profesionales para tu oficio, desde el celular y en la obra.',

  /** Precio de venta mostrado en los botones de compra. */
  price: {
    usd: env.VITE_PRICE_USD ?? 'US$ 15',
    ars: env.VITE_PRICE_ARS ?? '$ 15.900',
  },

  /** Link de pago en dólares (Lemon Squeezy). Si queda vacío, el botón se oculta. */
  buyUrlUSD: env.VITE_BUY_URL_USD ?? 'https://futurislabs.lemonsqueezy.com/buy/presupuestos',
  /** Link de pago en pesos (Ualá Bis). Si queda vacío, el botón se oculta. */
  buyUrlARS: env.VITE_BUY_URL_ARS ?? 'https://link.uala.com.ar/futurislabs-presupuestos',

  /** Soporte y landing. */
  supportEmail: 'hola@futurislabs.net',
  landingUrl: 'https://futurislabs.net/presupuestos',
  /** Guía de uso: la abre el ítem "Ayuda" del menú, en una pestaña nueva. */
  helpUrl: 'https://futurislabs.net/presupuestos/guia/',
  siteUrl: 'https://futurislabs.net',

  /** Identificador del producto para las licencias (tiene que coincidir con PRODUCT_ID). */
  productId: 'presupuestos',

  /** Prefijo de todas las claves de localStorage. Cambialo por microapp. */
  storagePrefix: 'fl.presupuestos',

  /** Cantidad máxima de dispositivos por licencia. */
  maxDevices: 3,

  /** Licencia: cada cuánto se revalida contra el servidor y cuánto se tolera sin internet. */
  license: {
    revalidateEveryDays: 7,
    offlineGraceDays: 30,
    /** En `npm run dev` esta clave desbloquea la app sin llamar a la API. */
    devKey: 'DEV',
  },

  /** Límites del modo demo. */
  demo: {
    /** Cuántos registros principales deja crear (acá: presupuestos). */
    maxRecords: 2,
    /** Cómo se llaman esos registros en los avisos. */
    recordLabel: 'presupuestos',
    allowExport: false,
    allowImport: false,
    /** El PDF se genera igual, pero con marca de agua. */
    allowPdf: true,
    /** Logo del negocio y fotos del trabajo: solo en la versión completa. */
    allowImages: false,
    /** Compartir el archivo PDF: solo en la versión completa. */
    allowShareFile: false,
    /** Marca de agua diagonal en los PDF de la demo. */
    pdfWatermark: 'DEMO · futurislabs.net',
  },

  /** Recordatorio de copia de seguridad. */
  backupReminderDays: 14,
} as const

export type AppConfig = typeof config
