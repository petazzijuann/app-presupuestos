/**
 * HERRAMIENTA · Oficios, unidades y catálogos precargados.
 *
 * Los ítems vienen SIN precio a propósito: cada uno cobra distinto y los
 * precios se mueven todo el tiempo. La app los deja listos para que el usuario
 * solo escriba su número.
 */
import type { CatalogItem, ItemKind, TradeId, UnitId } from './types'

export const UNITS: { id: UnitId; label: string; short: string }[] = [
  { id: 'unidad', label: 'Unidad', short: 'u' },
  { id: 'metro', label: 'Metro lineal', short: 'm' },
  { id: 'm2', label: 'Metro cuadrado', short: 'm²' },
  { id: 'hora', label: 'Hora', short: 'h' },
  { id: 'jornada', label: 'Jornada', short: 'jorn.' },
  { id: 'boca', label: 'Boca / punto', short: 'boca' },
  { id: 'global', label: 'Global', short: 'global' },
]

const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]))

export const unitShort = (id: UnitId): string => UNIT_BY_ID.get(id)?.short ?? id
export const unitLabel = (id: UnitId): string => UNIT_BY_ID.get(id)?.label ?? id

export const KIND_LABEL: Record<ItemKind, string> = {
  material: 'Material',
  obra: 'Mano de obra',
}

export const TRADES: { id: TradeId; label: string; emoji: string }[] = [
  { id: 'electricidad', label: 'Electricidad', emoji: '💡' },
  { id: 'plomeria', label: 'Plomería', emoji: '🚰' },
  { id: 'gas', label: 'Gas', emoji: '🔥' },
  { id: 'pintura', label: 'Pintura', emoji: '🎨' },
  { id: 'albanileria', label: 'Albañilería', emoji: '🧱' },
  { id: 'aire', label: 'Aire acondicionado', emoji: '❄️' },
  { id: 'carpinteria', label: 'Carpintería', emoji: '🪚' },
]

export const tradeLabel = (id: TradeId): string =>
  TRADES.find((t) => t.id === id)?.label ?? id

/** [tipo, nombre, unidad, categoría] — se arma el CatalogItem al cargarlo. */
type Seed = [ItemKind, string, UnitId, string]

const SEEDS: Record<TradeId, Seed[]> = {
  electricidad: [
    ['obra', 'Boca de luz nueva', 'boca', 'Instalación'],
    ['obra', 'Tomacorriente nuevo', 'boca', 'Instalación'],
    ['obra', 'Punto de TV / datos', 'boca', 'Instalación'],
    ['obra', 'Cambio de llave o tecla', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de térmica', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de disyuntor', 'unidad', 'Reparaciones'],
    ['obra', 'Armado de tablero', 'unidad', 'Tablero'],
    ['obra', 'Tablero de obra provisorio', 'unidad', 'Tablero'],
    ['obra', 'Cableado por metro', 'metro', 'Cableado'],
    ['obra', 'Canalización embutida por metro', 'metro', 'Cableado'],
    ['obra', 'Cañería a la vista por metro', 'metro', 'Cableado'],
    ['obra', 'Puesta a tierra con jabalina', 'unidad', 'Instalación'],
    ['obra', 'Instalación de artefacto de luz', 'unidad', 'Instalación'],
    ['obra', 'Colocación de ventilador de techo', 'unidad', 'Instalación'],
    ['obra', 'Búsqueda de falla', 'hora', 'Diagnóstico'],
    ['obra', 'Medición y certificado de instalación', 'global', 'Diagnóstico'],
    ['obra', 'Jornada de electricista', 'jornada', 'Mano de obra'],
    ['material', 'Cable unipolar 2,5 mm (metro)', 'metro', 'Materiales'],
    ['material', 'Cable unipolar 4 mm (metro)', 'metro', 'Materiales'],
    ['material', 'Caño corrugado 3/4" (metro)', 'metro', 'Materiales'],
    ['material', 'Caja rectangular', 'unidad', 'Materiales'],
    ['material', 'Llave térmica 16 A', 'unidad', 'Materiales'],
    ['material', 'Disyuntor diferencial', 'unidad', 'Materiales'],
    ['material', 'Módulo de tomacorriente', 'unidad', 'Materiales'],
    ['material', 'Tablero de embutir 8 módulos', 'unidad', 'Materiales'],
  ],
  plomeria: [
    ['obra', 'Cambio de canilla', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de flexible', 'unidad', 'Reparaciones'],
    ['obra', 'Reparación de pérdida', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de mochila de inodoro', 'unidad', 'Reparaciones'],
    ['obra', 'Destape de cañería', 'global', 'Destapaciones'],
    ['obra', 'Destape con máquina', 'hora', 'Destapaciones'],
    ['obra', 'Instalación de termotanque', 'unidad', 'Instalación'],
    ['obra', 'Instalación de calefón', 'unidad', 'Instalación'],
    ['obra', 'Instalación de inodoro', 'unidad', 'Instalación'],
    ['obra', 'Instalación de bacha o lavatorio', 'unidad', 'Instalación'],
    ['obra', 'Colocación de grifería de ducha', 'unidad', 'Instalación'],
    ['obra', 'Cañería de agua por metro', 'metro', 'Cañerías'],
    ['obra', 'Cañería cloacal por metro', 'metro', 'Cañerías'],
    ['obra', 'Instalación de bomba presurizadora', 'unidad', 'Instalación'],
    ['obra', 'Detección de pérdida', 'hora', 'Diagnóstico'],
    ['obra', 'Jornada de plomero', 'jornada', 'Mano de obra'],
    ['material', 'Caño termofusión 20 mm (metro)', 'metro', 'Materiales'],
    ['material', 'Caño cloacal 110 mm (metro)', 'metro', 'Materiales'],
    ['material', 'Canilla de cocina', 'unidad', 'Materiales'],
    ['material', 'Flexible 1/2"', 'unidad', 'Materiales'],
    ['material', 'Termotanque 80 litros', 'unidad', 'Materiales'],
    ['material', 'Codo / cupla termofusión', 'unidad', 'Materiales'],
  ],
  gas: [
    ['obra', 'Instalación de cocina', 'unidad', 'Instalación'],
    ['obra', 'Instalación de termotanque a gas', 'unidad', 'Instalación'],
    ['obra', 'Instalación de calefón a gas', 'unidad', 'Instalación'],
    ['obra', 'Instalación de estufa / tiro balanceado', 'unidad', 'Instalación'],
    ['obra', 'Prueba de hermeticidad', 'global', 'Pruebas'],
    ['obra', 'Detección de fuga de gas', 'hora', 'Pruebas'],
    ['obra', 'Cañería de gas por metro', 'metro', 'Cañerías'],
    ['obra', 'Cambio de flexible de gas', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de llave de paso', 'unidad', 'Reparaciones'],
    ['obra', 'Colocación de medidor', 'unidad', 'Instalación'],
    ['obra', 'Ventilación / rejilla reglamentaria', 'unidad', 'Instalación'],
    ['obra', 'Conducto de evacuación por metro', 'metro', 'Cañerías'],
    ['obra', 'Plano y trámite de habilitación', 'global', 'Trámites'],
    ['obra', 'Certificado de gasista matriculado', 'global', 'Trámites'],
    ['obra', 'Jornada de gasista', 'jornada', 'Mano de obra'],
    ['material', 'Caño epoxi 1/2" (metro)', 'metro', 'Materiales'],
    ['material', 'Flexible de gas homologado', 'unidad', 'Materiales'],
    ['material', 'Llave de paso 1/2"', 'unidad', 'Materiales'],
    ['material', 'Rejilla de ventilación', 'unidad', 'Materiales'],
  ],
  pintura: [
    ['obra', 'Pintura de pared interior (m²)', 'm2', 'Interior'],
    ['obra', 'Pintura de cielorraso (m²)', 'm2', 'Interior'],
    ['obra', 'Enduido plástico (m²)', 'm2', 'Preparación'],
    ['obra', 'Lijado y sellado (m²)', 'm2', 'Preparación'],
    ['obra', 'Tratamiento antihumedad (m²)', 'm2', 'Preparación'],
    ['obra', 'Pintura de frente exterior (m²)', 'm2', 'Exterior'],
    ['obra', 'Pintura impermeabilizante de techo (m²)', 'm2', 'Exterior'],
    ['obra', 'Pintura de reja o portón (m²)', 'm2', 'Herrería'],
    ['obra', 'Barnizado de madera (m²)', 'm2', 'Maderas'],
    ['obra', 'Esmalte en puertas y marcos', 'unidad', 'Carpinterías'],
    ['obra', 'Empapelado (m²)', 'm2', 'Interior'],
    ['obra', 'Armado de andamio', 'global', 'Preparación'],
    ['obra', 'Cubrir muebles y pisos', 'global', 'Preparación'],
    ['obra', 'Jornada de pintor', 'jornada', 'Mano de obra'],
    ['material', 'Látex interior (20 L)', 'unidad', 'Materiales'],
    ['material', 'Látex exterior (20 L)', 'unidad', 'Materiales'],
    ['material', 'Enduido (balde 25 kg)', 'unidad', 'Materiales'],
    ['material', 'Fijador al agua (10 L)', 'unidad', 'Materiales'],
    ['material', 'Esmalte sintético (4 L)', 'unidad', 'Materiales'],
    ['material', 'Cinta de papel y film', 'global', 'Materiales'],
  ],
  albanileria: [
    ['obra', 'Levantar pared de ladrillo (m²)', 'm2', 'Mampostería'],
    ['obra', 'Revoque grueso (m²)', 'm2', 'Revoques'],
    ['obra', 'Revoque fino (m²)', 'm2', 'Revoques'],
    ['obra', 'Contrapiso (m²)', 'm2', 'Pisos'],
    ['obra', 'Carpeta de nivelación (m²)', 'm2', 'Pisos'],
    ['obra', 'Colocación de cerámico de piso (m²)', 'm2', 'Pisos'],
    ['obra', 'Colocación de revestimiento de pared (m²)', 'm2', 'Revestimientos'],
    ['obra', 'Demolición de pared (m²)', 'm2', 'Demolición'],
    ['obra', 'Retiro de escombros', 'global', 'Demolición'],
    ['obra', 'Apertura de canaleta por metro', 'metro', 'Instalaciones'],
    ['obra', 'Tapado de canaletas por metro', 'metro', 'Instalaciones'],
    ['obra', 'Colocación de marco de puerta', 'unidad', 'Carpinterías'],
    ['obra', 'Dintel / viga de encadenado por metro', 'metro', 'Estructura'],
    ['obra', 'Impermeabilización de losa (m²)', 'm2', 'Techos'],
    ['obra', 'Jornada de albañil', 'jornada', 'Mano de obra'],
    ['obra', 'Jornada de ayudante', 'jornada', 'Mano de obra'],
    ['material', 'Cemento (bolsa 50 kg)', 'unidad', 'Materiales'],
    ['material', 'Cal (bolsa 25 kg)', 'unidad', 'Materiales'],
    ['material', 'Arena (m³)', 'unidad', 'Materiales'],
    ['material', 'Ladrillo hueco 12 (unidad)', 'unidad', 'Materiales'],
    ['material', 'Pegamento para cerámicos (bolsa)', 'unidad', 'Materiales'],
    ['material', 'Alquiler de volquete', 'unidad', 'Materiales'],
  ],
  aire: [
    ['obra', 'Instalación de split 2.200–3.000 W', 'unidad', 'Instalación'],
    ['obra', 'Instalación de split 4.500–6.000 W', 'unidad', 'Instalación'],
    ['obra', 'Instalación de multisplit (por unidad interior)', 'unidad', 'Instalación'],
    ['obra', 'Desinstalación de equipo', 'unidad', 'Instalación'],
    ['obra', 'Cañería frigorífica adicional por metro', 'metro', 'Instalación'],
    ['obra', 'Carga de gas refrigerante', 'global', 'Service'],
    ['obra', 'Limpieza de equipo split', 'unidad', 'Service'],
    ['obra', 'Limpieza profunda con hidrolavado', 'unidad', 'Service'],
    ['obra', 'Detección de pérdida de gas', 'hora', 'Service'],
    ['obra', 'Cambio de placa electrónica', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de turbina o motor', 'unidad', 'Reparaciones'],
    ['obra', 'Vacío y presurizado', 'global', 'Service'],
    ['obra', 'Colocación de soportes y ménsulas', 'unidad', 'Instalación'],
    ['obra', 'Desagüe con bomba de condensado', 'unidad', 'Instalación'],
    ['obra', 'Jornada de técnico', 'jornada', 'Mano de obra'],
    ['material', 'Caño de cobre 1/4 + 3/8 (metro)', 'metro', 'Materiales'],
    ['material', 'Aislación para cañería (metro)', 'metro', 'Materiales'],
    ['material', 'Ménsulas para condensadora', 'unidad', 'Materiales'],
    ['material', 'Gas refrigerante R-410A (kg)', 'unidad', 'Materiales'],
    ['material', 'Bomba de condensado', 'unidad', 'Materiales'],
  ],
  carpinteria: [
    ['obra', 'Mueble bajo mesada por metro', 'metro', 'Muebles'],
    ['obra', 'Alacena por metro', 'metro', 'Muebles'],
    ['obra', 'Placard a medida (m²)', 'm2', 'Muebles'],
    ['obra', 'Interior de placard (m²)', 'm2', 'Muebles'],
    ['obra', 'Biblioteca o estantería a medida (m²)', 'm2', 'Muebles'],
    ['obra', 'Colocación de puerta placa', 'unidad', 'Puertas'],
    ['obra', 'Cepillado y ajuste de puerta', 'unidad', 'Reparaciones'],
    ['obra', 'Cambio de herrajes', 'unidad', 'Reparaciones'],
    ['obra', 'Colocación de zócalo por metro', 'metro', 'Terminaciones'],
    ['obra', 'Mesada de madera por metro', 'metro', 'Terminaciones'],
    ['obra', 'Deck de madera (m²)', 'm2', 'Exterior'],
    ['obra', 'Lijado y laqueado (m²)', 'm2', 'Terminaciones'],
    ['obra', 'Diseño y medición en obra', 'global', 'Proyecto'],
    ['obra', 'Jornada de carpintero', 'jornada', 'Mano de obra'],
    ['material', 'Placa melamina 18 mm', 'unidad', 'Materiales'],
    ['material', 'Placa MDF 18 mm', 'unidad', 'Materiales'],
    ['material', 'Herrajes de cajón (juego)', 'unidad', 'Materiales'],
    ['material', 'Bisagra de cazoleta', 'unidad', 'Materiales'],
    ['material', 'Tapacanto (metro)', 'metro', 'Materiales'],
    ['material', 'Laca poliuretánica (4 L)', 'unidad', 'Materiales'],
  ],
}

export const seedCount = (trade: TradeId): number => SEEDS[trade]?.length ?? 0

/**
 * Catálogo precargado para los oficios elegidos, sin precios y sin repetidos
 * (si alguien hace plomería y gas, "cambio de llave de paso" entra una sola vez).
 */
export function seedCatalog(trades: TradeId[], uid: () => string): CatalogItem[] {
  const out: CatalogItem[] = []
  const seen = new Set<string>()
  for (const trade of trades) {
    for (const [kind, name, unit, category] of SEEDS[trade] ?? []) {
      const dedupe = `${kind}|${name.toLowerCase()}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      out.push({ id: uid(), kind, name, unit, price: 0, category })
    }
  }
  return out
}
