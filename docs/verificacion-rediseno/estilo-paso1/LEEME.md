# Estilo de botones, selectores, tipografía y listas — Paso 1 (pesos y tamaños, solo teléfono)

Tag previo: `pre-estilo-botones-2026-11-20`. Mediciones en píxeles reales de teléfono (390 px, ya con la escala `--esc` de 0,85) con `tests/e2e-menus/medir-estilo.js`; el «antes» es el commit anterior.

Capturas (390 px, claro y oscuro): `antes/` y `despues/` — Inicio (p01-home), Servicios (p02-servicios), ficha de servicio de administración (p03-ficha-servicio) y Canciones (p06-canciones).

## Tabla de roles (tokens de ancora-tipo.css, solo teléfono)
| Rol | Antes (px) | Regla | Después (px) | Token |
|---|---|---|---|---|
| título de pantalla | 28,9 | ×0,61 (taller: 29 → 17,6) | 17,6 | --t-titulo 2.125rem → 1.294rem |
| título de tarjeta (fecha) | 23,8 | ×0,59 (taller: 24 → 14,1) | 14,0 | --t-fecha 1.75rem → 1.03rem |
| cifra | 22,1 | ×0,88 | 19,4 | --t-cifra 1.625rem → 1.43rem |
| día | 20,4 | ×0,88 | 18,0 | --t-dia 1.5rem → 1.32rem |
| grande | 17,0 | ×0,88 | 15,0 | --t-grande 1.25rem → 1.1rem |
| sección | 15,3 | ×0,88 | 13,5 | --t-seccion 1.125rem → .99rem |
| nombre | 14,45 | ×0,88 | 12,7 | --t-nombre 1.0625rem → .935rem |
| cuerpo | 13,6 | ×0,88 | 12,0 | --t-cuerpo 1rem → .88rem |
| secundario (texto de botón) | 12,75 | ×0,88 | 11,2 | --t-secundario .9375rem → .825rem |
| etiqueta | 12,0 | ×0,88 = 10,6 → piso | 11,0 | --t-etiqueta max(12px, .75rem) → max(11px, .75rem) |
| mínimo | 11,0 | piso | 11,0 | sin cambio |

Pesos (tokens): etiquetas y chips 500 → 400 (`--w-fuerte`); títulos 500 → 500 (`--w-negrita`, ya estaban en 500 en teléfono); texto de botones y nombres 500 (`--w-boton`, `--w-nombre`, nuevos; en escritorio valen 600, lo mismo que valía `--w-fuerte`); botón principal 600 → 500; cifras 600 (sin cambio).
Alto y esquinas de botón (44 → 38 px, esquinas sin cambio): se aplican en el Paso 2; ver la nota del piso de 44 px en el reporte.
