# Presupuestos · Futurislabs

Microapp web para armar **presupuestos profesionales de oficios** (plomería, electricidad, gas,
pintura, albañilería, aire acondicionado y carpintería) desde el celular, en la obra. Pago único,
licencia por dispositivo, datos guardados en el navegador del usuario y funcionamiento offline (PWA).

Sale del template de `app-costos`: el "kit" (licencia, demo, datos, layout) es el mismo y la
herramienta vive entera en `src/tool/`.

---

## 1. Qué hace

- **Mi negocio**: nombre, oficios, logo, teléfono/WhatsApp, mail, zona, CUIT, moneda, condiciones
  por defecto (validez, forma de pago, seña %, garantía, notas al pie) e IVA opcional, apagado por
  defecto porque la mayoría son monotributistas. La primera vez entra por un **asistente de 3 pasos**.
- **Catálogo**: ítems de material o mano de obra, con unidad (unidad, metro, m², hora, jornada,
  boca/punto, global), precio y categoría. Según los oficios elegidos se precargan **15 a 25 ítems
  típicos sin precio**. Botón **Actualizar precios**: sube (o baja) un % a todo o a una categoría.
- **Clientes**: nombre, teléfono y dirección. Se crean al vuelo desde el presupuesto.
- **Presupuesto**: número correlativo automático con prefijo configurable (`P-0001`), fecha,
  validez, cliente, dirección de la obra, descripción, ítems desde el catálogo (buscador) o libres,
  subtotal por material y por mano de obra, descuento (% o monto), IVA, total, seña y saldo, plazo,
  forma de pago, garantía, notas y hasta **3 fotos** comprimidas a 1200 px. Se puede **duplicar** y
  guardar como **plantilla**.
- **Estados**: Borrador → Enviado → Aceptado / Rechazado → Terminado → Cobrado, con lista filtrable,
  **resumen del mes** (presupuestado, aceptado, % de aceptación, pendiente de cobro) y aviso de
  **seguimiento** cuando algo lleva 3 días o más enviado sin respuesta.
- **Salidas**: PDF A4 generado en el cliente, compartir por WhatsApp (Web Share API con el archivo;
  si no se puede, descarga + `wa.me` con el texto armado), copiar resumen para WhatsApp y
  **comprobante de trabajo realizado** con la leyenda "Documento no válido como factura".

## 2. Cómo está organizado

```
src/
  config.ts            Panel de control: nombre, precios, links de compra, límites de la demo…
  styles/tokens.css    Colores y tipografías (acento naranja de obra; el resto, igual que Costos)
  assets/brand/        Logo de Futurislabs (fuente del logo de interfaz)
  kit/                 Todo lo reutilizable entre microapps
    access.tsx         Acceso: bloqueado / licencia / demo + límites (useLimits)
    license.ts         Cliente de /api/license/*, vigencia y mensajes de error
    ActivateScreen.tsx Pantalla "Activa tu licencia" con los botones de compra
    DemoBar.tsx        Barra fija del modo demo
    Header.tsx         Header con el menú (Exportar, Importar, Ayuda, Desactivar)
    backup.ts          Exportar / importar .json (+ enganche para las imágenes) y recordatorio
    storage.ts         localStorage con prefijo + almacenamiento persistente
    pwa.tsx            "Instalar app" (Android) y "Agregar a inicio" (iPhone)
    theme.ts, ui.tsx   Modo claro/oscuro y primitivas de interfaz
  tool/                LA HERRAMIENTA
    calc.ts            Totales, numeración, vigencia, precios, seguimiento y resumen (puro)
    calc.test.ts       Tests con Vitest
    money.ts           Monedas, formato y redondeo (reutilizado de Costos)
    types.ts           Modelo de datos
    trades.ts          Oficios, unidades y catálogos precargados
    defaults.ts        Valores iniciales, duplicados, plantillas, ejemplo y migración
    images.ts          IndexedDB + compresión de logo y fotos
    pdf.ts             PDF A4 con jsPDF (import dinámico)
    share.ts           Web Share API, wa.me, resumen para WhatsApp y portapapeles
    Tool.tsx, components/
functions/             Backend mínimo (Cloudflare Pages Functions)
  api/license/{activate,validate,deactivate}.ts
  api/admin/create-key.ts
public/                Íconos de la PWA, favicon, _headers
scripts/gen-icons.mjs  Regenera los íconos sin dependencias externas
```

Regla simple: **si algo sirve para la próxima microapp, va en `src/kit/`**.

## 3. Desarrollo

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
npx wrangler pages dev dist
```

> **Nota sobre `wrangler.toml`.** Este repo tiene uno en la raíz, con el nombre del proyecto, el
> binding de KV y las variables no secretas. Mientras exista, Cloudflare Pages lo toma como única
> fuente de verdad para esos valores: lo que se cargue en el panel y no esté en el archivo deja de
> aplicarse. Los secretos (`LS_PRODUCT_ID`, `ADMIN_TOKEN`) y las `VITE_*` del build siguen en el
> panel, porque no van versionados.

## 4. Deploy en Cloudflare Pages

1. Subí el repo a GitHub y en Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
2. Configuración de build:
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Deploy command: vacío. Si el proyecto te obliga a poner uno, usá
     `npx wrangler pages deploy dist --project-name=app-presupuestos`, nunca `npx wrangler deploy`.
3. **Dominio**: Custom domains → `presupuestos.futurislabs.net`.
4. **KV**: se reutiliza el mismo namespace de licencias que `app-costos` (binding `LICENSES`,
   id `73b4fa6f7ed040b794c860f97e7fe537`), ya declarado en `wrangler.toml`. Las claves quedan
   separadas por `PRODUCT_ID`, así una clave de Costos no abre Presupuestos.
5. **Variables de entorno** (Settings → Environment variables, en Production y Preview):

   | Variable | Qué es | Secreta |
   |---|---|---|
   | `LS_PRODUCT_ID` | ID numérico del producto en Lemon Squeezy | no |
   | `PRODUCT_ID` | Identificador del producto (`presupuestos`, ya en `wrangler.toml`) | no |
   | `ADMIN_TOKEN` | Token que usa n8n para crear claves | **sí** |
   | `MAX_DEVICES` | Máximo de dispositivos (`3`, ya en `wrangler.toml`) | no |
   | `VITE_BUY_URL_USD` | Link de pago en dólares | no |
   | `VITE_BUY_URL_ARS` | Link de pago en pesos | no |
   | `VITE_PRICE_USD` / `VITE_PRICE_ARS` | Precios que se muestran en los botones (`US$ 15`) | no |

   Las que empiezan con `VITE_` se compilan dentro del JavaScript: **nunca pongas secretos ahí**.

## 5. Licencias

Hay dos tipos de clave y el servidor decide cuál es según el formato:

### a) Lemon Squeezy (compras en USD)

License API pública de Lemon Squeezy (form-urlencoded, sin API key). Al activar verificamos que
`meta.product_id` sea igual a `LS_PRODUCT_ID`; si la clave es de otro producto, la rechazamos y
desactivamos la instancia recién creada. El límite de dispositivos se configura en Lemon Squeezy
(*Activation limit* = 3) para que coincida con `config.maxDevices`.

### b) Claves propias `FL-XXXX-XXXX-XXXX` (compras en pesos)

Viven en KV (binding `LICENSES`), una entrada por clave:

```json
{
  "product": "presupuestos",
  "email": "persona@ejemplo.com",
  "createdAt": "2026-10-25T12:00:00.000Z",
  "instances": [{ "id": "uuid", "name": "Presupuestos · Android", "createdAt": "…" }],
  "active": true
}
```

Máximo 3 instancias (`MAX_DEVICES`). Poner `"active": false` bloquea la clave (reembolsos).

```bash
curl -X POST https://presupuestos.futurislabs.net/api/admin/create-key \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@ejemplo.com"}'
# -> { "ok": true, "key": "FL-7K2M-4PQX-R9AB", "product": "presupuestos", ... }
```

### c) En el cliente

- Guarda `{ key, instanceId, checkedAt, source }` en `localStorage`.
- Revalida cada **7 días**; sin internet sigue funcionando hasta **30 días**.
- En `npm run dev`, la clave `DEV` desbloquea sin tocar la API.

Códigos que devuelve la API: `invalid_key`, `device_limit`, `wrong_product`, `expired`, `server`,
`empty`.

## 6. Demo

- `/` sin licencia muestra la pantalla de activación; `/?demo` entra directo en modo demo.
- Límites (en `config.demo`): **2 presupuestos**, sin logo, sin fotos, sin exportar ni importar.
- El **PDF sí se genera**, con marca de agua diagonal `DEMO · futurislabs.net` y sin la opción de
  compartir el archivo (se descarga).

## 7. Datos del usuario

- Los datos van en `localStorage` bajo el prefijo `fl.presupuestos`.
- Las **imágenes** (logo y fotos) van en **IndexedDB** (`fl.presupuestos.images`), comprimidas a
  1200 px las fotos y 480 px el logo: en `localStorage` llenarían la cuota en dos fotos.
- Menú → **Exportar datos** descarga un `.json` que **incluye las imágenes en base64** (el kit lo
  resuelve con `registerBackupExtra`, que la herramienta engancha en `Tool.tsx`). Si el archivo pasa
  los 4 MB, el aviso recuerda guardarlo en la computadora o en la nube. **Importar datos** restaura
  los datos y las imágenes.
- Al abrir la app se pide `navigator.storage.persist()` para que el navegador no borre nada.
- Si pasaron más de 14 días desde la última copia, aparece un recordatorio suave.

> Si cambiás `storagePrefix`, acordate de cambiar también la clave del tema en `index.html` (el
> script que evita el parpadeo lee `fl.presupuestos.theme`).

## 8. Calidad

- Toda la lógica está en `src/tool/calc.ts`, en funciones puras, con tests (`npm test`) de:
  totales con descuento en % y en monto, IVA activado y desactivado, seña y saldo, numeración
  correlativa (incluido no reciclar números borrados), actualización de precios por % y por
  categoría, detección de seguimiento a los 3 días, vigencia y resumen del mes.
- El PDF se arma con **jsPDF cargado con `import()` dinámico**: la app abre liviana y la librería
  baja recién cuando se pide un PDF. Las fuentes son las internas (Helvetica/WinAnsi), que cubren
  acentos, ñ, ² y los símbolos de moneda latinos sin embeber nada.
- Mobile-first de verdad: navegación abajo para usar con el pulgar, botones de 44 px para arriba,
  una sola columna y verificado a **360 px sin scroll horizontal** en claro y oscuro (asistente,
  catálogo, presupuesto, lista y negocio).
- Accesibilidad: labels en todos los campos, foco visible, `aria-pressed` / `aria-current` en los
  controles de selección y contraste AA en ambos temas.

## 9. Marca

- `src/styles/tokens.css` mantiene las superficies, la tinta navy y las tipografías de Costos
  (**Space Grotesk** + **Inter**, servidas con `@fontsource` para que funcionen offline) y cambia
  solo el acento: naranja de obra `#b2510b` en claro y `#ff9f4a` en oscuro.
- El ícono de la PWA es propio: una hoja de presupuesto dibujada por `scripts/gen-icons.mjs` sobre
  el navy de la marca, con el encabezado en naranja y el total en menta. El logo de la interfaz
  sigue siendo el isotipo de Futurislabs.
