# Propuesta (SIN APLICAR) · estilo de botones para Cronograma y Notas · solo teléfono (≤ 768 px)

Estado: es solo una propuesta; no se cambió ningún archivo de la app. Escritorio queda idéntico: `ScheduleTool` y `FreeTextTool` son los mismos componentes en escritorio y teléfono, y sus botones llevan estilos en línea (que ganarían sobre `.anc-bt`), así que el estilo nuevo iría en una rama `useTelefonoYa()` (como en OrdenTelefono, Perfil y PantallaAdmin). Las clases `.anc-bt…` solo existen dentro de `@media (max-width:768px)`.

Criterios de siempre: solo íconos que ya existen en la app (lucide, ya importados en otras pantallas), nada inventado; solo tokens existentes (`--anc-btn-*`, `--anc-ink`, `--anc-no`, `--anc-sunk`…); primario negro solo para la acción principal de la pantalla; las acciones de peligro conservan su estilo de peligro.

## Cronograma (`components/ScheduleTool.tsx`)

| Hoy (teléfono) | Propuesta | Ícono (¿ya existe?) | Notas |
|---|---|---|---|
| «+» al final de la fila de alta: cuadrado gris de solo ícono junto a los campos Hora y «Nuevo ítem…» | Los dos campos quedan en una fila (Hora 70 px + texto). Debajo, un botón de ancho completo **«Añadir ítem»**, secundario (`anc-bt anc-bt--s`), deshabilitado mientras el texto está vacío (igual que hoy) | `Plus` (sí; es el de «Añadir ítem» del Checklist) | Secundario, como los de Checklist (decisión 2 de la tanda anterior); el único primario de esta pantalla sería «Guardar» en sus paneles |
| «×» rojo de borrar fila (solo ícono, hoy `#B91C1C` escrito a mano) | Se queda como botón solo de ícono, con la zona de toque de 44 px que ya le da `.am-h`; el color pasa al token de peligro `--anc-no` | `X` (sí; el que ya usa) | Sin texto: no entra en `.anc-bt`. Alternativa (no recomendada): mandarlo al «⋯» de la fila con `Trash2`, como en el Checklist; es un cambio de comportamiento, no de estilo |
| «⋯» de la cabecera de la tarjeta | Se queda solo ícono (24 px visibles, 44 px de toque); sin cambios de estilo | `MoreHorizontal` (sí) | Mismo botón que en Notas: los dos quedan iguales |
| Panel «Elegir plantilla»: cierre «×» de 14 px sin zona de toque | Solo ícono con 44 px de toque | `X` (sí) | |
| Panel «Elegir plantilla» → al aplicar con filas existentes: «Reemplazar», «Agregar al final», «Cancelar» en una fila | Apilados, el principal arriba: **Reemplazar** primario, **Agregar al final** secundario, **Cancelar** secundario | Reemplazar: `Replace` (existe, hoy en «Cambiar» de HojasEquipo; **ícono prestado**, mejor revisarlo). Agregar al final: `Plus` (sí). Cancelar: `X` (sí) | «Reemplazar» borra filas: se podría pasar a estilo de peligro como en las ventanas; lo dejo en primario para igualar a «Reemplazar» actual (hoy negro) |
| Renombrar plantilla (en línea): «Guardar» y «Cancelar» | **Guardar** primario, **Cancelar** secundario, apilados bajo el campo | `Check` y `X` (sí) | |
| Panel «Guardar como plantilla»: campo + «Guardar» + «Cancelar» en una fila | Campo arriba; debajo **Guardar** (primario, `Check`) y **Cancelar** (secundario, `X`) apilados | `Check` y `X` (sí) | |
| Filas de plantilla (nombre) y «⋯» de cada plantilla | Sin cambios (son filas de selección y un menú, no botones de texto) | — | |
| Asa de arrastre (`GripVertical`) | Sin cambios de estilo | — | **Hallazgo:** el arrastre usa `draggable` de HTML, que no funciona con el dedo; en teléfono el asa no hace nada. Propongo decidir aparte si se quita el asa en teléfono o se agregan subir/bajar (ahí sí habría que elegir íconos) |
| Menú del «⋯» (hoja): Aplicar plantilla…, Guardar como plantilla, Actualizar «…», Vaciar, Quitar esta herramienta | Sin cambios de estilo (ya es la hoja de menús) | `Trash2` solo en «Quitar»; **sin ícono claro:** Aplicar plantilla…, Guardar como plantilla, Actualizar «…». «Vaciar» podría llevar `Trash2` (existe) | Quedan «sin ícono claro» a propósito |

## Notas (`components/FreeTextTool.tsx`, el «⋯» viene de `PantallaHerramienta`)

| Hoy (teléfono) | Propuesta | Ícono | Notas |
|---|---|---|---|
| «⋯» de la cabecera (junto a «Guardado» / «Guardando…») | Igual que el de Cronograma: solo ícono, 44 px de toque, sin cambios de estilo | `MoreHorizontal` (sí) | Es lo único «botón» de la pantalla; su menú tiene solo «Quitar esta herramienta» (`Trash2`, peligro) |
| «Guardado» / «Guardando…» | Se queda como texto (no es un botón) | — | |
| Campo (textarea): sin borde propio, 16 px por la regla global, **muestra el asa de redimensionar** | Mismo estilo de campo ya usado en teléfono (fondo `--anc-sunk`, esquinas de 12 px, mínimo 44 px), alto inicial algo mayor (≈ 160 px) y sin asa (`resize:none`): con el dedo el asa estorba y no se usa | — | El tamaño de 16 px ya está garantizado (`campos-16px`) |

## Resumen de «sin ícono claro»
Ninguna acción nueva queda sin ícono. Con ícono prestado: **Reemplazar** (`Replace`). Sin ícono claro, y se quedan como texto en la hoja de menú: **Aplicar plantilla…**, **Guardar como plantilla**, **Actualizar «…»**. Solo ícono (sin texto, a propósito): «×» de borrar fila y «⋯».

## Qué haría falta para aplicarlo (cuando lo apruebes)
- Rama `useTelefonoYa()` en `ScheduleTool` y `FreeTextTool` (escritorio intacto; comparación 1280/820 antes/después).
- Un test nuevo en `tests/portal/botones-texto.test.js` (grupo h) y escenarios de captura para: alta de ítem, «Reemplazar/Agregar al final», «Guardar como plantilla» y renombrar (hoy ad10 y ad11 solo muestran el reposo).
- Capturas 390 y 360, claro y oscuro, antes y después.
