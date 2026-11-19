# Informe para mezclar `dev` a `main` (actualizado el 17 nov 2026)

## RESULTADO FINAL DE LA MEZCLA (17 nov 2026)

**La mezcla se hizo con tu autorización del 17-nov. `main` y `dev` quedaron en `8c8e49a`** (verificado con `git ls-remote`). Fue fast-forward: no hay commit de merge.

| Paso | Resultado |
|---|---|
| Comprobación previa | `main` = `cec007a`, `dev` = `0883a42`, en local y en `origin`. |
| Tag previo | `pre-mezcla-dev-main-2026-11-17` sobre `cec007a`, subido a `origin`. |
| Primer intento | Fast-forward local a `0883a42` y `verificar.sh` **falló** (código 1) solo en `test:portal`. No se subió nada. |
| Commit extra | `8c8e49a` (solo pruebas, ver abajo). `verificar.sh` sobre `dev` en ese commit: **exit 0**. |
| `main` | Fast-forward a `8c8e49a`; `verificar.sh` sobre `main`: **exit 0** (portal 111 suites y 956 comprobaciones, auth 14 y 169, correo 1 y 22, textos 8 y 56). Subido sin force. |
| Vercel | Ambos proyectos con despliegue de producción en éxito para `8c8e49a`: `ancora-teams` (<https://ancora-teams-1eh10ztmh-ancora-worship.vercel.app>) y `ancora.teams` (<https://ancorateams-awz3a9qne-ancora-worship.vercel.app>). Son las URLs del despliegue; el dominio de producción lo ves tú en el panel. |
| Prueba en producción | **No hecha por mí** (habría escrito en la base real y requiere sesiones): la hace Claudia en el teléfono con la lista de la sección 6. |
| Base de datos | No se consultó ni se modificó. |

**Por qué existe el commit `8c8e49a`.** Tres archivos de pruebas comprobaban que ciertas partes «seguían igual que en `main`», comparando contra la rama `main`: `tests/portal/ficha-admin-ui.test.js`, `tests/portal/palabras-con-acordes.test.js` y, en un comentario de instrucciones, `tests/e2e-menus/ficha-admin-acordes.js`. Mientras `dev` iba por delante, eso tenía sentido. Al mezclar, `main` pasa a ser igual que `dev` y la comparación deja de servir: la prueba de la ficha buscaba en `main` el bloque del menú antiguo, que ya no existe allí, y falló. No era un fallo de la app. El commit solo cambia la referencia: ahora comparan contra el tag `pre-mezcla-dev-main-2026-11-17` (el `main` anterior a la mezcla, `cec007a`). No cambia lo que se comprueba ni toca código de la app. Se revisaron todas las referencias a `main` en `tests/` y `scripts/`: las demás pruebas ya usan commits fijos (`499ac8d`, `cf09fde`, etc.) o solo nombran el elemento `<main>` de la página.

**Vuelta atrás (en texto).** El punto de retorno es el tag `pre-mezcla-dev-main-2026-11-17` (`cec007a`). Lo más limpio es un commit de reversión del conjunto de la mezcla; devolver `main` al tag reescribe la historia pública y solo se haría con tu OK explícito aparte. En Vercel se puede volver al despliegue anterior de cada proyecto con la reversión rápida. La migración 056 es aditiva y no hay que revertirla. Si se vuelve atrás, los borradores vuelven a ser visibles para los músicos. Nota: las pruebas ahora dependen de que ese tag exista en el repositorio; no se debe borrar.

---

(Lo que sigue es el informe previo a la mezcla, tal como se entregó.)

**Solo informe: no se ejecutó nada de la mezcla** (ni merge, ni push, ni tags de `main`). Repositorio `iamjairotoro/ancora.teams`.
Estado medido el 17-nov: `main` = `cec007a`, `dev` = `0883a42` (el 14-nov era `7445c4e`; desde entonces se agregaron los dos commits del teclado). `main` es ancestro directo de `dev` (el punto común es el propio `cec007a`): **la mezcla puede ser fast-forward**, sin commit de merge. `dev` no pierde nada de `main`.
`dev` tiene 40 commits que `main` no tiene (8 son merges de `main` hacia `dev`, 3 son solo pruebas, 1 es documentación). En archivos, fuera de `docs/`: 163 (+12213 / −450, contando pruebas y herramientas); el resto son capturas y notas en `docs/`.

## 1. Qué hay en `dev` y no en `main`, por área

| Área | Commits clave | Qué es |
|---|---|---|
| **Lectura con acordes del músico (C3)** | `add61ab` C3a, `edbe1eb` C3b, `6ffcd0f` C3c, `474374e` C3d, `e941926`, `2fc1fe9`, `611fc72` | Barra superior, cabecera, tira de partes (fija arriba mientras se lee), hoja «Preferencias», «Ajustes de fuente» y «Previsualizar tonalidad». Preferencia nueva `detalles` (por defecto activada). |
| **Adjuntos** | `3fc3e8b` | Los PDF salen del final de la canción y pasan a su propia pantalla «Adjuntos – canción» (músico y administración), con estado vacío. |
| **Esqueletos de carga** | `cf09fde` (admin móvil paso 1) | Marcadores grises en teléfono para quitar el salto «pantalla antigua → nueva» al cargar (lista, ficha, lectura del músico, editor). |
| **Ficha admin móvil** | `b5478d0` paso 2, `dd4bec3` paso 3, `d26f881` paso 5, `a6c6f99`, `7445c4e` (este último, orden de botones) | Cabecera nueva, aviso «Borrador» con «Publicar», estado vacío, menú «⋯» como hoja. `a6c6f99` corrige que «Archivar» y «Eliminar» volvían a la lista aunque fallaran. |
| **Borradores (`publicada`)** | `51b9e2e` (paso A), migración 056 | Una canción nueva nace como borrador: la ve el admin; no la ven los músicos (catálogo y ficha) ni se ofrece al armar un setlist. |
| **Nueva canción (teléfono)** | `51b9e2e` A (Datos y Más datos), `fee3a9a` B (editor), `b9a332b` C (tira con «+») | Flujo completo de crear una canción desde el teléfono. |
| **Arreglos** | `008782a` D («Repetir ×N», campo `arreglo`; el menú ya se retiró), `4034c3d` D2, `b9ebe54` S2 | El servidor guarda el orden (`default_arrangement`) solo si la canción no tiene uno propio, comparando en el mismo update; con arreglo propio agrega al final las secciones nuevas (D2). |
| **Estructura de la canción** | `11b418f` S0, `aeea4aa` S1, `b9ebe54` S2, `d811aac` S3, `6011f52` S4, `568c9c0` S5, `517005f` S6-A, `39defde` S6-B | La lectura soporta la misma sección varias veces no seguidas; lógica pura; tira como estructura; hoja «Agregar a la estructura»; menú del círculo; «Eliminar sección» y «Renombrar» con Deshacer. Todo esto solo vive en el editor de canción **nueva**. |
| **Teclado del editor móvil** | `6914e49` paso 1, `0883a42` paso 2 | Con el teclado abierto en iPhone, el panel de botones flotaba a mitad de pantalla y el texto quedaba en una franja de unos 24 px (ya ocurría en `main`, no es regresión). Paso 1: el editor se ancla a la zona visible (gancho `useTecladoPantalla`, solo el editor; las hojas pequeñas no cambian). Paso 2: solo CSS con el teclado abierto: texto visible de 156 a 216 px según ancho y zona segura. |
| **Pruebas y herramientas** | `8040058`, `0850e2a`, `11b418f` | Fijan la ficha admin contra un rango de commits (no contra `main`), la fecha de una prueba, y la regresión en navegador en paralelo. |
| **Merges y docs** | `2e77afd`, `7c5eeb3`, `e2fed18`, `8b18378`, `3128139`, `1f3312e`, `e26612a`, `53863a3`, `fe905fb` | Traen de `main` a `dev` (etapas 2 a 4 del líder, filtro del cron) y una nota en PENDIENTES. |

Lo que **no** aparece como diferencia: el editor móvil v2 y su endurecimiento (ya en `main` desde el 8-nov, `f65760a`), el guardado con respaldo y las migraciones 054a, 054b y 055.

## 2. Requisitos previos
- **Migraciones:** 055 (respaldo de letra y tono) ya está en `main` y aplicada. 056 (`songs.publicada boolean not null default true`) es el único archivo de migración nuevo; está en `dev` y Claudia la aplicó y verificó. Es aditiva: las canciones existentes quedan `publicada = true`.
- **Comprobación previa de la 056** (la hace Claudia en Supabase): el archivo `056-verificacion.sql` debe devolver `existe = 1`, tipo `boolean`, `admite_nulos = NO`, valor por defecto `true`. Si quedó alguna canción de prueba en borrador, `canciones_no_publicadas` será mayor que 0: conviene saber cuáles son antes de mezclar.
- **Variables de entorno:** ninguna nueva. El diff no agrega lecturas de `process.env` ni cambia `package.json` salvo la lista de pruebas (sin dependencias nuevas, sin cambios en el lock). Los dos proyectos de Vercel deben conservar las variables que ya tienen.
- **Almacenamiento:** «Nueva canción» sube la carátula al bucket `song-covers`, el mismo que ya usa el formulario de `main`.
- **Cron:** `vercel.json` y la ruta del recordatorio no cambian. No se prueba ninguna ruta cron en producción.
- **Antes de desplegar:** que `dev` siga verde con `verificar.sh` (hoy, sobre `0883a42`: sale con 0; portal 111 suites y 956 comprobaciones, auth 14 y 169, correo 1 y 22, textos 8 y 56) y confirmar con Claudia que no hay otra cosa pendiente en `main`.

## 3. Riesgos y qué prueba cubre cada uno

**Lo que cambia hoy para los músicos**
1. **Lectura con acordes (C3):** toda canción con acordes se abre con la lectura nueva (en cualquier ancho de pantalla). Las canciones sin acordes conservan la pantalla «Letra». Riesgo: una canción rara se ve distinta. Cubre: pruebas unitarias `lectura-c3a/b/c/d` y `lectura-tira-fija`, y las de navegador del mismo nombre a 390 y 360 px en claro y oscuro; S0 prueba la lectura con una sección repetida no seguida.
2. **Adjuntos:** el PDF ya no está al final de la canción: se abre desde el clip de la barra. Cubre: `adjuntos-pantalla` (unitaria y navegador).
3. **Filtro de borradores:** el catálogo y la ficha del músico excluyen `publicada = false`; los selectores de setlist también. Si la columna no existe, la lectura se repite sin el filtro (nunca esconde por falta del dato). Cubre: `nueva-cancion-paso-a`, `cancion-acordes-ruta` y `ficha-eliminar-archivar`. Riesgo residual: hoy, **en producción con `main` actual**, un borrador creado desde `dev` sí lo ven los músicos; deja de pasar con la mezcla.
4. **Preferencia `detalles`:** se guarda en las preferencias de lectura que ya existen; el código viejo ignora la llave desconocida. Cubre: `lectura-c3b` (validación y lectura de la preferencia).

**Lo que cambia solo para la administración**
5. **Teléfono:** ficha con cabecera nueva, menú «⋯» como hoja, estado vacío, aviso «Borrador» con «Publicar», lista con esqueletos y «+» para crear canción, pantalla de adjuntos, y todo el flujo «Nueva canción» con su estructura. Cubre: `admin-movil-*`, `nueva-cancion-*`, `estructura-s0` a `s6b`, y los de navegador a 390 y 360 px en claro y oscuro. El escritorio se comparó contra un build del commit anterior (capturas de 1280 px) en los pasos del rediseño: no cambió.
6. **Escritura de datos reales:** (a) inserta canciones nuevas siempre en borrador; (b) «Publicar» cambia solo `publicada`; (c) «Archivar» y «Eliminar» ya existían; (d) el guardado por la ruta de acordes sigue protegido por la huella del contenido, el respaldo previo de letra y tono, la confirmación de afectación del arreglo y la comprobación dentro del mismo update (`is null` o igual al valor leído). Cubre: `estructura-s2-servidor`, `nueva-cancion-paso-d` y `d2`, `guardar-acordes`, con mutaciones.
7. **Base compartida:** las pruebas en navegador usan servidor simulado y datos inventados: ninguna escribió en la base real. No hay migraciones nuevas aparte de la 056 ya aplicada. Las políticas abiertas de dos tablas (`banda_assignments` y `team_positions`) no cambian.

## 4. Cambios de comportamiento sobre canciones existentes (lista explícita)
1. Músicos: toda canción con acordes se lee en la pantalla C3 (barra, cabecera, tira de partes fija, Preferencias, Ajustes de fuente, Previsualizar tonalidad). Las secciones repetidas por arreglo se ven como siempre, repitiendo la letra completa.
2. Músicos: los adjuntos PDF se abren en su pantalla; sin adjuntos la pantalla muestra un estado vacío (antes la sección no se dibujaba).
3. Músicos: la cabecera de la canción puede ocultarse con el interruptor «Detalles de la canción»; por defecto está activo, igual que antes.
4. Todos: las canciones existentes quedan `publicada = true`; nada existente se esconde.
5. Administración (teléfono y escritorio): «Archivar» y «Eliminar» desde la ficha solo vuelven a la lista si terminaron de verdad; si falla, la ficha queda abierta (antes volvía igual). «Publicar» solo aparece en borradores.
6. Administración (teléfono, editor de una canción **ya guardada**): sin cambios en lo visible. Sí cambia el servidor: si la canción **ya tiene un arreglo propio** y el guardado crea secciones nuevas, esas secciones se agregan al final del arreglo con repetición 1 (antes no entraban al arreglo y la lectura no las mostraba). No toca ni reordena las entradas existentes.
7. Administración (teléfono): la lista y la ficha muestran marcadores grises mientras cargan; el texto «Sin resultados» ya no parpadea.
8. Administración (teléfono, editor de canciones guardadas y de nueva): con el teclado abierto el editor ocupa justo la zona visible y el panel va en una sola fila pegado al teclado; se ocultan Tono, ABC/123 y la frase de ayuda (y en canción nueva también la tira de círculos y su cabecera). Deshacer, Rehacer y el botón de modo siguen a la vista. Al cerrar el teclado todo vuelve como estaba. Sin teclado nada cambia.
9. Ninguna canción existente cambia de letra, tono, acordes ni orden sin que el admin la edite y guarde.

## 5. Plan de mezcla (descrito, sin ejecutar)
1. Congelar `dev`: confirmar que `dev` y `fix-teclado-editor` apuntan al mismo commit (`0883a42`; `estructura-ui` queda en `7445c4e`, dos commits atrás) y que `verificar.sh` sobre ese HEAD exacto sale con 0.
2. Crear un tag previo en `main` (por ejemplo `pre-mezcla-dev-main-2026-11-xx`, apuntando a `cec007a`) y subirlo, para tener el punto de vuelta atrás.
3. Mezclar `dev` en `main` solo con fast-forward (se puede). Si por algún motivo no fuera fast-forward, me detengo y consulto.
4. Correr `verificar.sh` sobre `main` ya mezclada; debe dar exactamente el mismo resultado que sobre `dev`.
5. Subir `main` (empuje normal, sin force) y comprobar con `git ls-remote` que `main` y `dev` apuntan al mismo commit y que el tag previo existe en el remoto.
6. Esperar a que ambos proyectos de Vercel terminen el despliegue (sección 6) antes de dar la mezcla por buena.
Cada paso con tu OK explícito en ese momento; el de hoy no autoriza ninguno.

**Vuelta atrás (en texto, sin comandos):**
- *Si el problema aparece durante el despliegue:* en Vercel (tuyo) se puede volver al despliegue anterior de cada proyecto con la opción de reversión rápida; no toca el repositorio ni la base.
- *Para devolver el código:* la opción más limpia es un commit de reversión del conjunto de commits de la mezcla (como el repositorio ya hizo antes con «Revert»). La alternativa, devolver `main` al tag previo, reescribe la historia pública y solo la haría con tu OK explícito aparte.
- *Base de datos:* la migración 056 es aditiva y con valor por defecto; el código viejo la ignora, así que no hay que revertirla. La llave `detalles` de las preferencias también es inofensiva para el código viejo.
- *Efecto residual de volver atrás:* con el código viejo los borradores vuelven a ser visibles para los músicos. Por eso las canciones de prueba deben borrarse antes de dar nada por terminado.

## 6. Verificación en producción tras desplegar
- **Vercel:** en los dos proyectos que despliegan este repositorio, el último despliegue de producción debe estar en estado *Ready* y mostrar el **mismo commit** (el SHA de `main` tras la mezcla). Si uno no tiene despliegue para ese commit (ya pasó una vez en octubre con la integración Vercel↔GitHub), no dar la mezcla por buena. Yo no veo el panel de Vercel: eso lo confirmas tú; yo confirmo el commit con `git ls-remote`.
- **Canción de prueba:** una sola, con nombre «ZZ Prueba mezcla (borrar)», creada por la administradora desde el teléfono; todo lo que escriba se hace sobre ella y nunca sobre canciones reales.
1. Crear la canción desde «Nueva canción» con una letra corta de 3 partes y repetir el coro con «Repetir aquí»; guardar.
2. Con una cuenta de músico: la canción **no** aparece en el catálogo ni abre por enlace directo; **no** se ofrece al armar un setlist. Con la cuenta de administración sí aparece con «Borrador».
3. Publicar desde la ficha: ahora la ve el músico, con la lectura C3 (tira de partes, coro repetido tres veces, Preferencias, Ajustes de fuente, Previsualizar tonalidad).
4. En el músico, abrir una canción real que ya tenga acordes (solo lectura) y una sin acordes (debe seguir con «Letra»), y abrir los adjuntos de una que tenga PDF.
5. Escritorio de administración: abrir el panel de canciones y la ficha de una canción real; debe verse como antes.
6. **Editor con teclado, en iPhone real** (lo único que no se pudo probar en el entorno; Chrome de escritorio no tiene teclado y se emuló): con la canción de prueba y luego con una canción guardada de letra larga, abrir «Editar con acordes» → «✎ Texto», tocar una línea de la mitad de abajo y comprobar que el panel queda pegado al teclado en una fila, se ven al menos 5 o 6 líneas de texto, Deshacer y Rehacer funcionan sin cerrar el teclado, y al cerrarlo vuelve el panel de dos filas. Repetir con la barra de Safari visible y oculta, y en la app instalada si se usa. La lista completa está en `docs/verificacion-rediseno/editor-teclado-paso2/LEEME.md`. Si falla, el arreglo se retira volviendo al tag `pre-teclado-paso1-dev-2026-11-16`.
7. Al terminar, archivar y eliminar «ZZ Prueba mezcla (borrar)» y volver a correr `056-verificacion.sql` para confirmar que no quedan borradores de prueba.
8. No llamar a `/api/reminder` ni a ninguna ruta cron.

## 7. Pendientes que quedan fuera de la mezcla
- **S7:** estructura editable en canciones con arreglo propio (hoy solo lectura, con aviso).
- **F:** editar datos y tira en canciones ya guardadas.
- **G:** escritorio (nada de esto existe allí).
- **Retiro de `lib/arregloCancion.ts`:** sin uso en la app desde S5; solo lo usan las pruebas del paso D y el servidor sigue aceptando el campo `arreglo`.
- **Menú viejo del modo Acordes** (tocar el nombre de una sección): borra y cambia el tipo sin confirmar y sin remapear la estructura; con dos partes del mismo nombre podría correr referencias.
- **Archivadas visibles a los músicos:** las canciones archivadas todavía pueden verse en el lado de los músicos; no se tocó.
- Menores ya anotados en `docs/PENDIENTES-code.md`: plegar repeticiones en la lectura, «Mover» ‹ › entre partes iguales.
