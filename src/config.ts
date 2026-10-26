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
  appName: 'Costos',
  /** Marca paraguas. */
  brand: 'Futurislabs',
  /** Una línea para la pantalla de activación. */
  tagline: 'Calcula tu costo real y tu precio de venta, sin planillas.',

  /** Precio de venta mostrado en los botones de compra. */
  price: {
    usd: env.VITE_PRICE_USD ?? 'US$ 19',
    ars: env.VITE_PRICE_ARS ?? '$ 19.900',
  },

  /** Link de pago en dólares (Lemon Squeezy). Si queda vacío, el botón se oculta. */
  buyUrlUSD: env.VITE_BUY_URL_USD ?? 'https://futurislabs.lemonsqueezy.com/buy/costos',
  /** Link de pago en pesos (Ualá Bis). Si queda vacío, el botón se oculta. */
  buyUrlARS: env.VITE_BUY_URL_ARS ?? 'https://link.uala.com.ar/futurislabs-costos',

  /** Soporte y landing. */
  supportEmail: 'hola@futurislabs.net',
  landingUrl: 'https://futurislabs.net/costos',
  /** Guía de uso: la abre el ítem "Ayuda" del menú, en una pestaña nueva. */
  helpUrl: 'https://futurislabs.net/costos/guia/',
  siteUrl: 'https://futurislabs.net',

  /** Prefijo de todas las claves de localStorage. Cambialo por microapp. */
  storagePrefix: 'fl.costos',

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
    maxProducts: 2,
    allowExport: false,
    allowImport: false,
    allowPdf: false,
  },

  /** Recordatorio de copia de seguridad. */
  backupReminderDays: 14,
} as const

export type AppConfig = typeof config
