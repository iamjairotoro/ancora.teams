# Plan · Cupo 0 («No se necesita en este servicio») — SIN IMPLEMENTAR

**Estado: plan para revisión. No se implementa nada ni se crea la migración hasta que Claudia confirme y se apruebe este plan** (regla 8 de `CLAUDE.md`). La migración la corre la persona en Supabase.

**Regla propuesta:** una posición puede pedir **0 cupos en un servicio solo si NO tiene a nadie asignado en él**. El mínimo del cupo pasa a ser el **último cupo ocupado** (0 si no hay nadie): para llegar a 0 primero se quita a la gente (así nadie queda asignado y «oculto»). El cupo por defecto sigue siendo 1.

**Qué significa 0:** esa posición no se necesita ese día: no cuenta en «Faltan N», «N sin cubrir» ni en los cupos totales; no aparece como vacante para el músico; no se le asigna a nadie.

## 1 · Migración `038-cupo-cero-en-servicios.sql` (el siguiente número libre; las `050a–d` son del punto 50)

Una sola consulta, sin comentarios (el resto del plan vive aquí, no en el archivo):

```sql
alter table public.service_position_slots drop constraint service_position_slots_slots_needed_check, add constraint service_position_slots_slots_needed_check check (slots_needed >= 0);
```

- Antes de correrla (solo lectura, en el editor, NO en el archivo): confirmar el nombre real del check → `select conname from pg_constraint where conrelid = 'public.service_position_slots'::regclass and contype = 'c';` (Postgres nombra un check en línea `tabla_columna_check`; la 015 lo creó en línea).
- **REVERTIR, aparte:** archivo `038-cupo-cero-en-servicios-revertir.sql` con dos consultas: `update public.service_position_slots set slots_needed = 1 where slots_needed = 0;` y la misma `alter table` con `check (slots_needed >= 1)`. Lo único que se pierde al revertir es el «No se necesita» (las filas en 0 vuelven al cupo por defecto, 1).
- Sin cambios de RLS ni de triggers; ningún aviso (setlist, nómina, reasignación, chat, respuestas) ni recordatorio usa cupos.
- **Orden de despliegue: la migración ANTES que el código.** Si el código sube primero, el «−» hasta 0 se rechazaría en la base y hoy `updateSlotsNeeded` ignora ese error (la pantalla mostraría 0 hasta recargar).

## 2 · Lectura `|| 1` → `?? 1` (un 0 hoy se lee como 1)

| Dónde | Hoy | Cambio |
|---|---|---|
| `app/admin/page.tsx:602` `getSlotsNeeded` | `…slots_needed \|\| 1` | `?? 1` |
| `lib/admin/estadoEquipoServicio.ts:48` | `…slots_needed \|\| 1` | `?? 1` (lo hereda `resumenServicios`, la lista y el Home móvil) |
| `app/home/page.tsx:399` `getSlotsNeeded` (Home de escritorio) | `\|\| 1` | `?? 1` |
| `app/home/page.tsx:276` (`totalSlots`) | `reduce(...) \|\| teamPositions.length` | con todo en 0 la suma es 0 y caería a `teamPositions.length`: usar «no hay filas» en vez de «la suma es 0» |
| `lib/portal/equipoServicio.ts:79` (vacantes que ve el MÚSICO) | `(cupo.get(p.id) \|\| 1)` | `?? 1`. **Es lógica del portal: la regla 4 pide tu OK expreso** |
| `app/api/duplicate-service/route.ts` | copia `slots_needed` tal cual | sin cambio (una fila en 0 se copia); con prueba |

## 3 · Guarda de `updateSlotsNeeded` (`app/admin/page.tsx:604`)

Hoy rechaza `newCount < 1`. Pasa a rechazar `< 0`. La regla de «solo 0 si nadie está asignado» y el tope de 20 se aplican en la pantalla por **una sola función** (`cupoMinimo` / `cupoDentroDeLimites`, `lib/admin/servicioMovil.ts`); la validación de servidor es de la fase de seguridad (ver `PENDIENTES`, punto 50). Además, que `updateSlotsNeeded` deje de ignorar el `error` del `upsert` y deshaga el cambio optimista si la base lo rechaza.

## 4 · El mínimo en un solo lugar

- `cupoMinimo(ultimoOcupado)`: de `Math.max(1, ultimoOcupado)` a `ultimoOcupado` (0 si nadie). `cupoDentroDeLimites` ya depende de él. Es el único cambio de regla en teléfono.
- **Stepper de teléfono** (`HojaPosicion`): el «−» se detiene en `minimo` (ahora puede ser 0); el «+» sale de 0 a 1.
- **Stepper de escritorio** (`AdminServiceView`, `disabled={n<=Math.max(1,asignados.length)}`): usa la misma función y el último cupo ocupado (hoy usa la cantidad de personas: con personas en los cupos 1 y 3 permite bajar a 1 y deja a la del 3 oculta). Cambio de escritorio ⇒ repetir la comparación de HTML.

## 5 · La regla de «participa» (`lib/admin/resumenServicios.ts`)

Hoy un equipo aparece en un servicio si tiene asignados, convocados o **alguna fila de cupo** (`!cuposEquipo.length`). Con 0 una fila en 0 no debe hacerlo aparecer. Nueva regla: participa si tiene asignados o convocados, **o** si alguna de sus posiciones pide al menos 1 cupo (una posición sin fila vale 1). Un equipo con **todas** sus posiciones en 0 y nadie asignado **no participa**: deja de salir en la lista de Servicios y en el Home móvil (no queda un «Convocar» ni un «Completo» sin sentido). Mixto (algunas en 0, otras no): participa, y las de 0 no suman a «Faltan N».
Cómo cuenta cada pieza con 0: **«Faltan N» / «sin cubrir»**: no suman (`max(0, 0 − llenos)`); **«N de M confirmados»** y **convocados**: solo personas; **«Completo»** (`estadoDeFila`): solo se evalúa si el equipo participa; **«Voluntarios · N de M»**: M no incluye las posiciones en 0.

## 6 · El texto de la ficha: «No se necesita»

- Texto nuevo en `lib/textos/servicio.ts`: `noSeNecesita: 'No se necesita'` (y la frase de la hoja: «No se necesita en este servicio»).
- **Tarjeta de posición (teléfono):** `0/0` y, en vez de «Falta N», la línea «No se necesita» (tarjeta atenuada).
- **Hoja de posición:** el stepper muestra 0, debajo «No se necesita en este servicio»; no hay filas «Falta» ni «Asignar»; al subir a 1 vuelve «Falta {posición} 1». Sin porcentajes; el estado nunca solo por color.
- **Escritorio:** el grupo de la posición con 0 dice «0/0» y «No se necesita» (en vez de una fila «Sin asignar»).
- **Portal del músico:** una posición en 0 no aparece como vacante (solo con el OK de la regla 4).

## 7 · Pruebas y capturas

**Pruebas nuevas/ajustadas:** la migración es un archivo de una sola consulta, sin comentarios, y el revertir es otro archivo (una prueba lee los dos); `cupoMinimo` con 0 y con huecos (último cupo ocupado); ningún `\|\| 1` de cupos queda en los cuatro sitios (prueba de fuente); `estadoEquipoServicio` con cupo 0; `resumenServicios` (equipo todo en 0 no participa; mixto sí; «Faltan N» no suma las de 0; una persona asignada impide el 0); `equipoServicio` del portal (sin vacante con 0); Home de escritorio (`totalSlots` con todo en 0); duplicar copia el 0; los dos steppers; textos «No se necesita» (voz y plural). Además de las suites de siempre: tsc, `next build` del HEAD exacto, `test:portal`, `test:auth`, `test:correo`, `test:textos`.
**Capturas (390 y 360 px, claro y oscuro):** tarjeta con 0; hoja con 0 (y el «+» desde 0); el «−» detenido en el último cupo ocupado; lista de Servicios y Home móvil con un equipo todo en 0 (oculto); **1280 px:** posición en 0 en el panel, y la comparación de HTML en reposo (con ruido medido) para demostrar que el escritorio no cambió donde no hay ceros.

## 8 · Orden de commits (todos locales hasta tu OK)

1. Migración + lectura `?? 1` + `lib` (`cupoMinimo`, `estadoEquipoServicio`, `resumenServicios`) con sus pruebas.
2. Teléfono (stepper, tarjeta, hoja, textos).
3. Escritorio y Home de escritorio (stepper, grupo de posición, `totalSlots`).
4. Portal del músico (solo si apruebas tocar `lib/portal`).

## 9 · Decisiones para Claudia

- ¿Confirmas «cupo 0 solo cuando nadie está asignado»? (la alternativa, borrar a quien esté asignado al bajar a 0, sería una escritura nueva y destructiva: no se propone).
- Un equipo con todo en 0: ¿**oculto** (propuesto) o visible como «No se necesita»?
- ¿Ajustamos también el portal del músico para que no muestre vacantes de una posición en 0?
