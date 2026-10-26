/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_PRICE_USD?: string
  readonly VITE_PRICE_ARS?: string
  readonly VITE_BUY_URL_USD?: string
  readonly VITE_BUY_URL_ARS?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv & { readonly DEV: boolean; readonly PROD: boolean }
}
