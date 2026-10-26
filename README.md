# Costos · Futurislabs

Microapp web para calcular **costos reales y precio de venta**. Pago único, licencia por
dispositivo, datos guardados en el navegador del usuario y funcionamiento offline (PWA).

Este repo es además la **plantilla** para las próximas microapps de Futurislabs: el "kit"
(licencia, demo, datos, layout) está separado de "la herramienta".

---

## 1. Cómo está organizado

```
src/
  config.ts            Panel de control: nombre, precios, links de compra, límites de la demo…
  styles/tokens.css    Colores y tipografías de la marca (único archivo a tocar para re-marcar)
  assets/brand/        Logo de Futurislabs (fuente de los íconos de la PWA)
  kit/                 Todo lo reutilizable entre microapps
    access.tsx         Estado de acceso: bloqueado / licencia completa / demo + límites
    license.ts         Cliente de /api/license/* , vigencia y mensajes de error
    ActivateScreen.tsx Pantalla "Activa tu licencia" con los botones de compra
    DemoBar.tsx        Barra fija del modo demo
    Header.tsx         Header con el menú (Exportar, Importar, Ayuda, Desactivar)
    backup.ts          Exportar / importar .json + recordatorio de copia
    storage.ts         localStorage con prefijo + almacenamiento persistente
    pwa.tsx            Botón "Instalar app" (Android) y aviso de "Agregar a inicio" (iPhone)
    theme.ts, ui.tsx   Modo claro/oscuro y primitivas de interfaz
  tool/                LA HERRAMIENTA: lo único que cambia entre microapps
    calc.ts            Toda la matemática, en funciones puras
    calc.test.ts       Tests con Vitest
    money.ts           Monedas, formato y redondeo hacia arriba
    types.ts, defaults.ts, Tool.tsx, components/
functions/             Backend mínimo (Cloudflare Pages Functions)
  api/license/{activate,validate,deactivate}.ts
  api/admin/create-key.ts
  _lib/                Código compartido (no se publica como ruta)
public/                Íconos de la PWA, favicon, _headers
scripts/gen-icons.mjs  Regenera los íconos sin dependencias externas
```

Regla simple: **si algo sirve para la próxima microapp, va en `src/kit/`**. Si es la calculadora
de costos, va en `src/tool/`.

## 2. Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173 — la clave DEV desbloquea la app
npm test         # tests de cálculo (Vitest)
npm run build    # typecheck + build estático en dist/
npm run preview  # sirve dist/
node scripts/gen-icons.mjs   # regenera los íconos de la PWA
```

Para probar las Pages Functions en local hace falta Wrangler:

```bash
npm run build
npx wrangler pages dev dist --kv LICENSES
# o, con los bindings ya escritos:
npx wrangler pages dev dist -c wrangler.example.toml
```

> **No agregues un `wrangler.toml` a la raíz.** Si Cloudflare Pages encuentra uno, cambia el
> modo de deploy: ejecuta `npx wrangler deploy` (el comando de Workers, que falla con
> *Missing entry-point to Worker script*) y además el archivo pasa a ser la única fuente de
> verdad, con lo que deja de leer las variables y los bindings cargados en el panel. Por eso
> acá se llama `wrangler.example.toml`.

## 3. Deploy en Cloudflare Pages

1. Sube el repo a GitHub y en Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
2. Configuración de build:
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Deploy command: **vacío** (Pages sube `dist` solo). Si el proyecto te obliga a poner uno,
     usá `npx wrangler pages deploy dist --project-name=costos`, nunca `npx wrangler deploy`.
3. **Dominio**: Custom domains → `costos.futurislabs.net` (Cloudflare crea el CNAME solo si el
   dominio está en la misma cuenta).
4. **KV**: Storage & Databases → KV → Create namespace (por ejemplo `futurislabs-licenses`).
   Después, en el proyecto de Pages: Settings → Bindings → KV namespace, con el nombre de
   binding **`LICENSES`**.
5. **Variables de entorno** (Settings → Environment variables, en Production y Preview):

   | Variable | Qué es | Secreta |
   |---|---|---|
   | `LS_PRODUCT_ID` | ID numérico del producto en Lemon Squeezy | no |
   | `PRODUCT_ID` | Identificador del producto para las claves propias (`costos`) | no |
   | `ADMIN_TOKEN` | Token que usa n8n para crear claves | **sí** |
   | `MAX_DEVICES` | Máximo de dispositivos (por defecto `3`) | no |
   | `VITE_BUY_URL_USD` | Link de pago en dólares | no |
   | `VITE_BUY_URL_ARS` | Link de pago en pesos | no |
   | `VITE_PRICE_USD` / `VITE_PRICE_ARS` | Precios que se muestran en los botones | no |

   Las que empiezan con `VITE_` se compilan dentro del JavaScript: **nunca pongas secretos ahí**.

## 4. Licencias

Hay dos tipos de clave y el servidor decide cuál es según el formato:

### a) Lemon Squeezy (compras en USD)

Se usa la License API pública de Lemon Squeezy (form-urlencoded, sin API key). Al activar
verificamos que `meta.product_id` sea igual a `LS_PRODUCT_ID`; si la clave es de otro producto,
la rechazamos y desactivamos la instancia que se acababa de crear.

El límite de dispositivos de estas claves se configura en Lemon Squeezy
(*Activation limit* = 3) para que coincida con `config.maxDevices`.

### b) Claves propias `FL-XXXX-XXXX-XXXX` (compras en pesos)

Viven en KV (binding `LICENSES`), una entrada por clave:

```json
{
  "product": "costos",
  "email": "persona@ejemplo.com",
  "createdAt": "2026-10-21T12:00:00.000Z",
  "instances": [{ "id": "uuid", "name": "Costos · Android", "createdAt": "…" }],
  "active": true
}
```

Máximo 3 instancias (`MAX_DEVICES`). Poner `"active": false` en el JSON bloquea la clave
(reembolsos, contracargos).

Crear una clave (esto es lo que llama **n8n** cuando se confirma un pago en pesos):

```bash
curl -X POST https://costos.futurislabs.net/api/admin/create-key \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@ejemplo.com"}'
# -> { "ok": true, "key": "FL-7K2M-4PQX-R9AB", "product": "costos", ... }
```

### c) En el cliente

- Guarda `{ key, instanceId, checkedAt, source }` en `localStorage`.
- Revalida cada **7 días**; si no hay internet, sigue funcionando hasta **30 días**.
- Mensajes de error claros: clave inválida, límite de dispositivos, clave de otro producto,
  clave vencida y sin conexión.
- En `npm run dev`, la clave `DEV` desbloquea sin tocar la API.

Códigos que devuelve la API: `invalid_key`, `device_limit`, `wrong_product`, `expired`,
`server`, `empty`.

## 5. Demo

- `/` sin licencia muestra la pantalla de activación con **Comprar en USD**, **Comprar en pesos**
  (el de pesos primero si la zona horaria es `America/Argentina/*`; si falta el link, el botón no
  aparece) y **Probar demo gratis**.
- `/?demo` entra directo en modo demo, para el botón de la landing.
- Límites de la demo (en `config.demo`): 2 productos, sin exportar, sin importar y sin PDF.

## 6. Datos del usuario

- Todo se guarda en `localStorage` bajo el prefijo `config.storagePrefix` (`fl.costos`).
- Menú → **Exportar datos** descarga un `.json`; **Importar datos** lo vuelve a cargar.
- Al abrir la app se pide `navigator.storage.persist()` para que el navegador no borre los datos.
- Si pasaron más de 14 días desde la última copia, aparece un recordatorio suave.

> Si cambias `storagePrefix`, acuérdate de cambiar también la clave del tema en `index.html`
> (el script que evita el parpadeo lee `fl.costos.theme`).

## 7. Cómo crear una microapp nueva desde esta plantilla

1. Copia el repo y renómbralo (`package.json → name`, `wrangler.toml → name`).
2. Edita `src/config.ts`: `appName`, `tagline`, precios, links de compra, `storagePrefix`,
   `landingUrl` y los límites de la demo.
3. Edita `src/styles/tokens.css` si la microapp tiene otra identidad visual. Si cambia el logo,
   reemplaza `src/assets/brand/futurislabs-icon.png` y corre `node scripts/gen-icons.mjs`
   (el color de fondo de los íconos es la constante `BG` del script).
4. Actualiza el `manifest` en `vite.config.ts` (nombre y descripción) y el `<title>` de
   `index.html`.
5. Borra `src/tool/` y escribe la herramienta nueva: un componente `Tool` que use
   `useStored('data', …)` para los datos y `useLimits()` para respetar la demo. **No toques
   `src/kit/`**.
6. En Cloudflare: nuevo proyecto de Pages, mismo KV (`LICENSES`) y un `PRODUCT_ID` distinto
   (las claves quedan atadas al producto, así una clave de una microapp no abre otra).
7. En Lemon Squeezy: producto nuevo → `LS_PRODUCT_ID` nuevo, con *Activation limit* = 3.

## 8. Calidad

- Toda la matemática está en `src/tool/calc.ts`, en funciones puras, con tests de los casos
  principales: costo proporcional de insumos, prorrateo de costos fijos, margen vs. markup,
  redondeo por moneda, canales con comisión y punto de equilibrio.
- Los precios se redondean **siempre hacia arriba**, con el paso de cada moneda
  (ARS/CLP: 100, COP: 500, UYU: 10, MXN: 1, USD/EUR/PEN: 0,50).
- Accesibilidad: labels en todos los campos, foco visible, roles y textos alternativos en el
  gráfico de costos, contraste AA en claro y oscuro.
- Mobile-first: una sola columna hasta `sm`, tablas con scroll propio y `overflow-x: hidden` en
  el `body` como red de seguridad.

## 9. Marca

- Los colores de `src/styles/tokens.css` están copiados de futurislabs.net
  (`src/styles/global.css` del sitio) con los nombres de tokens de esta plantilla:
  `--fl-paper → --fl-bg`, `--fl-line → --fl-border`, `--fl-accent* → --fl-brand*`, y
  `--fl-signal` se mantiene igual. Navy `#0b1736` como tinta, azul `#0b5ed7` como acento y
  menta `#10e0b8` como señal.
- Tipografías: **Space Grotesk** (títulos) e **Inter** (texto), las mismas del sitio, pero
  servidas desde la app con `@fontsource` (se importan en `src/index.css`) para que la PWA
  funcione sin internet. El service worker precachea los `.woff2`.
- El logo vive en `src/assets/brand/` (isotipo y lockup completo). `scripts/gen-icons.mjs` lo
  decodifica, lo recorta y genera: `public/icons/icon-{192,512}.png`, los maskable,
  `apple-touch-icon.png`, `favicon-32.png` y las versiones chicas de interfaz en
  `public/brand/`. No necesita ninguna dependencia.
