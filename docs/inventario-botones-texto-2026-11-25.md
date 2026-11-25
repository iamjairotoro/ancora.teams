# Inventario de botones y pestañas de TEXTO que aún no usan el estilo nuevo (teléfono ≤ 768 px) · 25 nov 2026

Paso 0, solo lectura: no se cambió nada de la app. Cómo se hizo: (1) recorrido en navegador real a 390 px de **37 pantallas** (portal del músico, administración y líder; `tests/e2e-menus/inventario-botones.js` + `escenarios/inventario-botones.json`, sin commitear) con 275 elementos distintos que no son `anc-bt` ni opción de `Segmentado`; de ahí se descartan las celdas de calendario, las filas y tarjetas completas (listas, canciones, personas, servicios) y los botones de solo ícono; (2) barrido del código de los directorios de teléfono para hallar botones que el recorrido no alcanzó (hojas, ventanas, editores). Lo que no vi en pantalla lo marco «solo en el código».

**Ya usan el estilo nuevo (no están aquí):** Confirmo / No puedo / Quitar / Aceptar aquí (`AccionesConvocatoria.tsx`), Orden del servicio y Notificar (`PantallaServicio.tsx`), Bloquear esta fecha / Quitar bloqueo (`PanelDia.tsx`), Nuevo mensaje directo (`ListaChats.tsx`), y los selectores `Segmentado` de Servicios, Canciones, Servicio, Apariencia y Personas | Equipos.

**Aclaración sobre `anc-bt--s`:** en `app/ancora-boton.css` es la variante **secundaria** (fondo gris, texto de tinta), no «pequeña»: todos los `anc-bt` miden 38 px de alto y **ancho completo**. No existe una variante pequeña en línea. Donde digo «botón pequeño» propongo `anc-bt--s`; si quieres un botón compacto que no ocupe todo el ancho hay que decidir si se crea esa variante (no la inventé).

## 1 · Candidatos a botón (acciones de una pantalla u hoja)
| # | Elemento | Archivo | Pantalla | Hoy | Propuesta | Por qué · ícono |
|---|---|---|---|---|---|---|
| 1 | **Orden · Checklist · Cronograma · Notas** | `components/servicio-movil/VistaEquipo.tsx:64` (`.fichaHerr`) | Servicios → servicio → equipo (admin y líder) | Pastillas redondas de 44 px con ícono | **`anc-bt--s` en cuadrícula de 2 columnas**, con su ícono (`IconoHerramienta`, ya existe) | Cada una lleva a una herramienta distinta, todas del mismo peso: no hay primaria. 5 botones apilados a ancho completo serían muy altos, por eso la cuadrícula. |
| 2 | **Añadir** (herramienta) | `VistaEquipo.tsx:65` (`.fichaHerr` con borde punteado) | igual que 1 | Pastilla punteada, sin relleno | **`anc-bt--s`** con `Plus` (ya se usa en la app); el borde punteado se pierde | Es una acción de agregar, no una herramienta. **Decisión: ¿pierde el punteado?** |
| 3 | **Añadir** (bloque del orden) | `components/orden/OrdenTelefono.tsx:46` (`.anadir`, ya trae `Plus`) | Orden del servicio | Pastilla ancha de 44 px | **`anc-bt--s`** ancho, con `Plus` | Ya es un botón ancho con ícono; solo cambia a la geometría común. |
| 3b | Añadir ítem (×2) | `components/servicio-movil/ChecklistLider.tsx:245-246` (`.anadir`) | Checklist del líder | Pastilla | **`anc-bt--s`** con `Plus` | Mismo caso. |
| 4 | **+ Bloquear un rango de fechas** | `app/portal/_components/disponibilidad/Disponibilidad.tsx:350` (`.rango`) | Servicios → Disponibilidad | Botón de 44 px con esquinas de 14 y un «+» de texto | **`anc-bt--s`** con `Plus` (reemplaza el «+» escrito) | Ya casi lo es; el «+» es un carácter, no un ícono. |
| 5 | **Gestionar equipos** | `components/PersonasPanel.tsx:192` (`.gestionar`, ya trae `SlidersHorizontal`) | Personas → Equipos | Enlace de texto azul en su propia línea | **`anc-bt--s`** con `SlidersHorizontal` | Es la acción principal de esa vista y hoy se pierde como enlace. |
| 6 | **Gestionar equipo** (líder) | `components/lider-movil/EquipoPropio.tsx:55` (`.enlaceGestionar`) | Líder → equipo | Enlace de texto | **`anc-bt--s`** con `SlidersHorizontal` | Mismo motivo y mismo ícono que 5. |
| 7 | **Agregar persona** (líder, ×2) | `components/lider-movil/PantallaEquipo.tsx:49` y `PersonasEquipoPropio.tsx:40` (`.boton`, pastilla de 44 px, ya con ícono) | Líder → equipo / personas | Pastilla ancha | **`anc-bt--p`** con su ícono actual | Es la acción principal de esas pantallas. |
| 8 | **Agregar** (gestión de equipos) | `components/TeamsAdminPanel.tsx` (`styles.btnPrimary`, pastilla de 42 px con `Plus`) | Personas → Gestionar equipos | Pastilla | **`anc-bt--p`** con `Plus` | Pantalla heredada (ver nota al final). |
| 9 | **Cerrar sesión** (Perfil) | `app/portal/_components/perfil/Perfil.tsx:109` (`.fila .centrada`, ya con `LogOut`) | Perfil | Fila centrada dentro de una tarjeta | **`anc-bt--s`** con `LogOut` | Es una acción, no un destino; no debe verse como una fila de lista. |
| 10 | **Cerrar sesión** (Admin) | `components/admin-movil/PantallaAdmin.tsx:45` (`.fila .salir`, con `LogOut`, en su propia lista al final) | Admin | Una fila más | **`anc-bt--s`** con `LogOut` | Igual que 9: es una acción, no un destino. |
| 11 | **Cerrar sesión** (sin acceso del líder) | `app/home/personas/page.tsx:51`, `app/home/resumen/page.tsx:51`, `app/home/servicios/page.tsx:67` | Líder, cuando no tiene acceso | Botón con estilos escritos en línea (`style={{…}}`) | **`anc-bt--p`**, con `LogOut` | Tres copias sueltas con estilo propio. |
| 12 | **Abrir servicio** | `components/home/HomeAdminMovil.tsx:96` (`BotonResponder`, 44 px, esquinas de 11) | Home admin, tarjeta del próximo servicio | Botón claro sobre tarjeta oscura | **`anc-bt--p`** (con `--bt-p-bg`/`--bt-p-fg` de tarjeta oscura, como ya se hace) | Es el único botón de la tarjeta. **Sin ícono claro.** |
| 13 | **Guardar** / **Cancelar** (Mis datos) | `app/portal/_components/perfil/MisDatos.tsx:63` (`.btn .btnA/.btnQ`, 166×44, esquinas de 10) | Perfil → Mis datos | Dos botones lado a lado | **Guardar `anc-bt--p` y Cancelar `anc-bt--s`, apilados** | Primaria + secundaria, como Confirmo / No puedo. **Sin ícono claro.** |
| 14 | **Generar / Regenerar enlace de acceso**, **Revocar**, **Cerrar** | `components/persona/AccessLinkControl.tsx:105,117,120` | Persona (ficha) → En la app | Botones de 44 px con esquinas de 11 | Generar `anc-bt--p`; Revocar y Cerrar `anc-bt--s` | **Sin ícono claro.** |
| 15 | **Listo** (hoja de posición) y **Asignar** | `components/servicio-movil/HojasEquipo.tsx:119` (`.guardar`) y `:89` (`.asignarBoton`); líder: `components/lider-movil/HojaPosicionLider.tsx:89,109` | Equipo → posición (admin y líder) | Botón de 44 px (esquinas de 12) y enlace | Listo `anc-bt--p`; Asignar `anc-bt--s` | **Sin ícono claro.** |
| 16 | **Confirmar / Cancelar** de las hojas | `components/servicio-movil/HojasServicio.tsx:140-141`; `components/lider-movil/EquipoPropio.tsx:32`, `HojaAgregarPersona.tsx:39`, `HojaPersona.tsx:41`; `components/orden/HojasOrden.tsx:49,76` | Hojas de «Más acciones», «Cambiar horario», líder, orden | Botones propios (`pantallas.boton`) | Confirmar `anc-bt--p`, Cancelar `anc-bt--s` | **Sin ícono claro.** |
| 17 | **Botones de las ventanas centradas** (confirmar / avisar) | `components/ventanas/VentanaCentrada.tsx:74` (`.boton`) | Toda la app (ventanas de confirmación) | Botones propios | Misma pareja `--p` / `--s` apilada | Una sola pieza que afecta a todas las confirmaciones. **Sin ícono claro.** |
| 18 | **+ Agregar canción** | `components/canciones/SongList.tsx:64` (`anc-btn anc-btn--accent`) | Admin → Canciones | Botón de 44 px con un «+» escrito | **`anc-bt--p`** con `Plus` | Acción principal de la pantalla. |
| 19 | **Crear y escribir** / **Crear sin letra** / **Más datos** | `components/canciones/NuevaCancionMovil.tsx:102,103,96,111` (`.principal`, `.secundario`, `.mas`) | Nueva canción | Botones propios | `--p`, `--s`, y «Más datos» como enlace | **Sin ícono claro.** Solo en el código. |
| 20 | **Plantillas**, **Crear checklist**, **Actualizar**, **Reintentar** | `components/servicio-movil/ChecklistLider.tsx:88,109,110,258`; `app/portal/_components/servicio/ChecklistServicio.tsx:69,114`; `CancionPortal.tsx:144`; `EditorCancionMovil.tsx:258,290` | Checklist, lectura, editor | Botones/enlaces propios | `anc-bt--s` (Reintentar y Actualizar), `--p` (Crear checklist) | **Sin ícono claro.** Solo en el código. |
| 21 | **Aa Tipografía**, **Adjuntos** | `app/portal/_components/CancionPortal.tsx:119-131` (`.aaBtn`, 96×44 y 91×44) | Lectura de canción | Pastillas en la barra de lectura | **Dejarlos** (controles de la barra de lectura, ya con ícono y compactos) | Un `anc-bt` de ancho completo no cabe en una barra. |

## 2 · Candidatos a selector de texto (`Segmentado`)
| # | Elemento | Archivo | Pantalla | Propuesta | Por qué |
|---|---|---|---|---|---|
| 22 | **Este mes · 3 meses · Este año** | `components/lider-movil/ResumenLider.tsx:35` (`.segmento`) | Líder → Resumen | **`Segmentado` de 3 opciones, sin ícono** (centrado) | Es exactamente un selector de periodo. **Sin ícono claro.** |
| 23 | Pastillas de **equipo** (con monograma de color) | `ResumenLider.tsx:28` (`.pildora`, solo con 2 o más equipos) | Líder → Resumen | **Dejarlas** como fichas, o `Segmentado` sin monograma | El monograma de color no es un ícono de línea y `Segmentado` solo acepta íconos de línea. **Decisión tuya.** |
| 24 | **Todos · General · Servicios/Ensayos · Directos** | `components/ChatModerationPanel.tsx:107` (`.cm-chip`) | Admin → Chats | **Dejarlos**: «Servicios/Ensayos» (118 px) no cabe en 4 columnas | Además, con el plan de chats por sala en pausa, ese panel puede cambiar. |
| 25 | **Texto / Volver a acordes** (alterna el modo del editor) | `components/canciones/EditorCancionMovil.tsx:273` (`.modoTexto`, un solo botón con `aria-pressed`) | Editor de canción móvil | **Dejarlo** | No es un selector de dos opciones sino un botón que alterna y cambia su texto; vive en la barra de herramientas con deshacer / rehacer. Solo en el código. |
| 26 | **Tipo de servicio** (grupo de opciones tipo radio; 2 o 3 opciones) | `components/servicio-movil/HojaNuevoServicio.tsx:48-49` (`.tipo`) | Hoja «Nuevo servicio» | **`Segmentado`** (si son 2 o 3 opciones de texto corto) | Era de las «decisión aparte» (radiogroups de las hojas). **Sin ícono claro.** Solo en el código; verifico cuántas opciones muestra antes de cambiarlo. |
| 27 | Opciones de las hojas de **tonalidad, preferencias y tipografía** | `lectura/HojaTonalidad.tsx`, `HojaPreferencias.tsx`; `tipografia/PanelTipografia.tsx`, `VentanaTipografia.tsx` | Lectura de canción | **Dejarlas** | Son selectores de valores (letras, tamaños), no pestañas. |
| 28 | **Noviembre ▾** (mes de la tira) | `components/home/TiraDias.tsx` (`.mes`) | Inicio y Home admin | **Dejarlo** | Abre una lista de meses; es un control propio de la tira. |

## 3 · Enlaces de texto: propuesta «dejarlos como enlace»
| # | Elemento | Archivo | Por qué |
|---|---|---|---|
| 29 | **Volver** (‹ Chats, ‹ Personas, ‹ Domingo 25 oct, ‹ Servicios, ‹ Canciones, ‹ Alabanza, Volver a Servicios, Volver al servicio) | `chats/VistaChat.tsx:40`; `PersonasPanel.tsx` (`.volver`); `servicio-movil/BarraSuperior.tsx:15`; `servicio/Servicio.tsx:88`; `CancionPortal.tsx` (`.back`); `adjuntos/PantallaAdjuntos.tsx:25`; `pantallas_enlace` | La cabecera lleva un enlace corto con chevron: un botón ancho robaría el título. Ya tienen `ChevronLeft`. |
| 30 | **Ver todos / Ver todas / Ver personas / Ver historial / Ver detalle › / Cambiar › / Ver servicio ›** | `home/HomeAdminMovil` y `inicio-telefono` (`.enlace`), `servicio-movil/ListaServicios.tsx:68`, `TarjetaConvocatoria.tsx:44`, `servicios/Servicios.tsx:49`, `Inicio.tsx:55` | Navegación secundaria al final de una sección, con el peso de enlace. |
| 31 | **Ordenar: Alfabético**, **Editar** (ficha de persona) | `SongList.tsx:81`, `PersonDetail.tsx:134` (`anc-btn--quiet`) | Controles discretos dentro de una barra de herramientas. |
| 32 | **Ver ›**, **Cancelar / Reintentar / Descartar** de las subidas de adjuntos | `AdjuntosCancion.tsx:83`; `canciones/SubidaAdjuntos.tsx:101-134` | Acciones por fila, pequeñas y en línea. |

## 4 · Cabeceras de modo
| # | Elemento | Archivo | Hoy | Propuesta | Por qué |
|---|---|---|---|---|---|
| 33 | **Modo Usuario** (administración) y **Modo Admin / Modo Líder** (Inicio del portal) | `components/modo/BotonModo.tsx` (un `<a>`, ya con `User`/`Shield`/`Users`; 32 px de alto y esquinas de 14) | Chip junto a la etiqueta «MODO ADMIN» | **Dejarlo como chip** (ya lleva ícono y esquinas de botón) | `anc-bt` es de ancho completo y no cabe en la cabecera; para unificarlo haría falta la variante compacta. **Decisión tuya.** |
| 34 | «MODO ADMIN» / «MODO LÍDER» (la etiqueta) | `BotonModo.tsx:22` (`EtiquetaModo`) | Texto, no es un control | Sin cambio | No es un botón. |

## 5 · Hoja «Escribirle a…» (chats)
| # | Elemento | Archivo | Hoy | Propuesta | Por qué |
|---|---|---|---|---|---|
| 35 | **Filas de personas** (avatar + nombre) | `chats/HojaDirecto.tsx:43` (`.persona`, 359×48, peso 400) | Filas separadas por línea | **Dejarlas como filas**, con el nombre en peso de título (500) como en las listas | Es una lista para elegir, no botones. |
| 36 | **«✕»** | `HojaDirecto.tsx:38` (`.cerrar`, un carácter «✕» de texto) | Círculo de 44 px | **Usar el ícono `X`** que ya usan las demás hojas (`HojaBase`) | Es un carácter y no un ícono; todas las demás hojas usan `X`. |
| 37 | **Título** «Escribirle a…» | `HojaDirecto.tsx:37` (`hoja.titulo`) | Ya usa el token de título | Sin cambio | Ya está al día. |

## 6 · Filas de menú (no son botones de texto) — propuesta: dejarlas
Filas de hoja de acciones con ícono (`pantallas_filaHoja`: Duplicar servicio, Nuevo servicio, Ver historial, Eliminar servicio, Orden/Checklist/Cronograma/Notas al añadir herramienta), `mas_fila` (Persona / Equipo del «+»), `pantalla-admin_fila` (Admins, Calendario, Chats, Equipos, Historial) y `perfil_fila` (Mis datos, Notificaciones). Son menús y listas de destinos con ícono y chevron: no deben ser botones anchos.

## 7 · Fuera de alcance (solo ícono, sin texto)
⋯ (`anc-rowMore`, 24 px), «+» redondos (`nuevo_mas`, `lista_mas`), ‹ › del calendario (`mesBtn`, 26 y 44 px), corazones, − / + de cupos, lápiz, «Cerrar» (`hoja.cerrar`, `anc-dClose`), enviar y los controles de foto, apariencia y reproductor. No se piden aquí.

## Notas
- **No recorridos en pantalla (solo código):** hojas de Disponibilidad (Guardar / Cancelar en `Disponibilidad.tsx:447,455`), editor y Nueva canción, Checklist del líder, ventanas, y las hojas de lectura. Si apruebas un grupo, lo reviso en pantalla antes de cambiarlo.
- **`TeamsAdminPanel`** (Personas → Gestionar equipos) es una pantalla heredada con muchos botones propios (`styles.btn`, `btnPrimary`, `btnGhost`…); propongo tratarla en un paso aparte y completo, no botón por botón.
- Hay también botones con estilo escrito en línea en `app/home/*/page.tsx` (los tres «Cerrar sesión» del punto 11).
- Estado del recorrido: sin pasos fallidos en las 37 pantallas.

## Decisiones de Claudia (25 nov 2026) y orden de los commits
1. Sin variante compacta nueva; «Modo …» se queda como está.
2. Pastillas de herramientas: cuadrícula de 2 columnas, botón secundario con su ícono; «Añadir» en una fila ancha aparte con `Plus`; verificar que «Cronograma» cabe a 360 px (si no, «…»).
3. Íconos: Confirmar / Guardar / Listo = `Check`; Cancelar / Cerrar = `X`. Asignar, Abrir servicio, Generar enlace y Revocar: sin ícono, texto centrado. No se inventa ninguno. Las confirmaciones de peligro conservan su estilo de peligro.
4. Las pastillas de equipo del Resumen del líder se quedan. «Este mes / 3 meses / Este año» pasa a `Segmentado` sin ícono (el componente admite opciones sin ícono; sin variante nueva).
5. `TeamsAdminPanel` queda fuera de esta tanda.
6. Lo marcado «dejar como están» queda como está.

Commits, uno por grupo y en este orden: (a) inventario + herramienta; (b) botones con ícono claro (Añadir/Plus, Gestionar equipo(s), Cerrar sesión, Agregar canción, Agregar persona); (c) pastillas de herramientas; (d) selector del Resumen del líder; (e) pares Guardar/Cancelar, Listo/Asignar y Confirmar/Cancelar de las hojas (con los botones sin ícono: Abrir servicio, Generar enlace y Revocar); (f) ventanas centradas; (g) «✕» de «Escribirle a…» con el ícono `X` y sus filas con el nombre en peso 500. Se reporta al terminar (b), (c) y (f).

