# Pendientes para Claude Code — lote acumulado

> Archivo vivo. Se le van sumando puntos y se manda **completo, una sola vez**,
> cuando esté cerrado. Mandarlo de a uno cuesta mucho más en tokens.
>
> Regla general de todos los puntos: el mockup manda. Si algo acá se contradice
> con `docs/mockup-admin-editorial.html`, gana el mockup.

---

## 1 · El ⋯ de las herramientas está fuera del panel

**Síntoma:** en las herramientas del servicio (Cronograma, Notas y las demás), el
menú de tres puntos aparece flotando arriba a la derecha, **por fuera** de la
tarjeta, con un hueco entre ambos.

**Causa:** se está renderizando como hermano del `.anc-panel`, no dentro de él.

**Corrección:** el ⋯ va **dentro** de `.anc-panel__head`, al final de la fila, en
la misma línea del título. Nunca como elemento suelto antes o después del panel.

Estructura correcta:

```tsx
<section className="anc-panel">
  <div className="anc-panel__head">
    <h2>Cronograma</h2>
    <span className="anc-n">3 items</span>
    <span className="anc-spacer" />
    <button className="anc-rowMore" aria-label="Acciones de Cronograma">⋯</button>
  </div>
  …contenido…
</section>
```

Aplica a **todas** las herramientas del servicio, no solo a las dos de la captura.

**Verificación:** ningún `.anc-rowMore` puede ser hermano directo de un
`.anc-panel`. Siempre descendiente de `.anc-panel__head` o de una fila.

---

## 2 · El ⋯ como patrón estándar en toda la app

El menú de tres puntos que ya existe en setlist es el patrón de la app.
Replicarlo en el resto, sin inventar variantes.

**Dónde tiene que existir, a nivel de fila** (aparece en hover, fijo en táctil):

- Canciones → cada fila de la lista
- Equipos → cada integrante de la tabla
- Personas → cada fila
- Servicio → cada slot de la nómina
- Servicio → cada item del orden del servicio *(ya está)*
- Adjuntos → cada archivo
- Chats → cada mensaje

**Dónde a nivel de cabecera** (siempre visible):

- Equipos → cabecera del equipo, junto a Ajustes
- Canciones → cabecera del detalle de canción
- Servicio → barra superior *(ya está)*
- Servicio → cabecera de **cada herramienta** (ver punto 1)

**Qué va adentro,** en este orden:

1. Acciones normales: Duplicar, Mover a…, Descargar, Copiar enlace
2. Separador
3. Destructivas al final: Archivar, Eliminar, Quitar del equipo

**Qué no debe pasar:**

- Ninguna acción destructiva visible en la fila. Ni X rojas, ni tachos, ni
  «Eliminar» como texto suelto.
- No duplicar una acción: si está en el menú, no va también en la fila.
- No inventar acciones que no existan hoy en esa pantalla.

**Implementación:** usar la clase `.anc-rowMore` que ya está en
`ancora-editorial.css`. No crear clases nuevas ni estilos por pantalla: el menú
debe verse idéntico en todas. Comportamiento ya definido ahí — `opacity:0` en
reposo, `1` en hover y en `:focus-visible`, y fijo bajo `@media (hover:none)`.

---

## 3 · Títulos de herramienta en caja mixta

**Síntoma:** las herramientas muestran `CRONOGRAMA` y `NOTAS` en mayúscula con
tracking.

**Corrección:** van como el resto de los títulos de panel — caja mixta, peso 700,
`font-size:.875rem`, la clase `h2` dentro de `.anc-panel__head`. «Cronograma»,
«Notas».

Las mayúsculas quedan **solo** para abreviaturas reales de posición: AG, VX1, MD,
SON. Es una decisión del rediseño, no una preferencia de una pantalla.

---

## 4 · El botón «+» del cronograma

**Síntoma:** es un cuadrado gris relleno al costado del campo de texto.

**Corrección:** usar el sistema de botones. Es una acción secundaria dentro de un
panel, así que va `.anc-btn .anc-btn--quiet`, o `.anc-btn--accent` si se decide
que es la acción primaria de esa herramienta. No un cuadrado con estilo propio.

Además, el campo «Hora» y el de texto deben usar el mismo estilo de input que el
resto de la app, no bordes propios.

---

## 5 · El chart de la canción está mostrando el texto crudo

**Síntoma:** en «All Hail King Jesus» el cuerpo muestra el texto pegado tal cual —
incluye el título, «Escrito por…», «Tono: E | BPM: 74 | Compas: 4/4» y los
encabezados `VERSO 1` como si fueran letra.

**Causa:** `lib/parseChart.ts` no se está usando, o su salida no se está guardando
en `song_sections` / `song_section_variants`. Lo que se guardó fue el bloque de
texto completo.

**Corrección:** pasar el texto por `parseChart()` **antes** de guardar. Los
metadatos que el parser no reconoce como sección (título, autores, la línea de
Tono/BPM) no van al cuerpo: se descartan o se ofrecen para rellenar los campos
del formulario, pero nunca se guardan como letra.

**Verificación:** ninguna canción debería tener una línea de letra que contenga
`BPM` o `Escrito por`.

---

## 6 · Las pastillas de estructura repiten el nombre

**Síntoma:** dicen «Pre-coro PRE CORO», «Coro CORO», «Bridge PUENTE».

**Causa:** se está concatenando el nombre de la sección con su código, y el código
quedó guardado como texto largo en vez de abreviatura.

**Corrección:** la pastilla muestra **solo el código corto**: `V1`, `PC`, `C`,
`P`. El nombre largo va en el encabezado de la sección dentro del chart
(`V1 · Estrofa 1`), no en la pastilla.

Los códigos válidos son los que genera `parseChart.ts`: IN, V1, V2, PC, C, P,
INT, TAG, OUT. Si en la base quedaron guardados como «PRE CORO», hay que
normalizarlos.

**Lo que sí funciona y no hay que tocar:** las pastillas ya navegan al hacer
clic. Eso está correcto.

---

## 7 · Las tarjetas del chart se ven sin cerrar

**Síntoma:** los bloques de sección se ven «no terminados», sin borde inferior ni
canto definido.

**Corrección:** cada sección del chart es un `.anc-panel` completo, con su anillo
de 1px y su filo superior, o no es un panel en absoluto y se separa solo por
espacio. **Lo que no puede quedar es a medio camino** — con fondo pero sin canto.
Mira `docs/ejemplo-nadie-como-el-senor.html`: ahí las secciones no llevan caja,
solo espacio y un encabezado en pastilla.

---

## 8 · No hay cómo editar una canción ya creada

**Síntoma:** una vez creada la canción no hay forma de volver a entrar a editarla,
ni de cambiar la tipografía o el tamaño del chart.

**Corrección:**

- El ⋯ de la cabecera del detalle debe incluir **Editar canción**, que abre el
  mismo flujo de creación con los datos cargados.
- La hoja de **Preferencias** hoy dice «Todavía no hay preferencias configurables
  acá». Tiene que traer lo que está en `docs/mockup-cancion-musico.html`:
  vista (Ambos / Acordes / Letras), tamaño de texto, notación, dos columnas y
  modo escenario.
- Las preferencias son **por persona**, no por canción: se guardan en el perfil y
  aplican a todos los charts.

---

## 9 · Botones que envuelven a dos líneas

**Síntoma:** «+ Posición» y otros botones con icono parten el texto en dos
renglones cuando el contenedor es angosto.

**Corrección:** todo `.anc-btn` lleva `white-space:nowrap` — ya está en el CSS, así
que si envuelve es porque se creó un botón con estilos propios. Usar las clases
del sistema. Y el `+` va como icono dentro del botón, no como elemento aparte.

---

## 10 · Quitar la pestaña «Posiciones» del equipo

En Equipos › [equipo] la pestaña **Posiciones** muestra «Próximamente». Ya no
corresponde: las posiciones se administran desde el riel de la pestaña
Integrantes.

**Corrección:** eliminar la pestaña. Quedan **Integrantes** y **Ajustes**.

---

## 11 · Paleta nueva para toda la app

**Archivo:** `app/ancora-tokens-v4.css`

Off white · Ivory · Nude · Obsidian, más los tres estados de confirmación en
color. Reemplaza los tokens de `ancora-editorial.css` **sin tocarlo**: es una
capa de sobreescritura que se importa justo después.

```tsx
import './globals.css';              // Tailwind / Bootstrap
import './ancora-editorial.css';
import './ancora-tokens-v4.css';     // ← acá
import './songs.css';
import './person-drawer.css';
import './home.css';
```

Cambios de fondo respecto a lo instalado:

- **Se va el degradado de fondo y el vidrio.** El fondo es un color plano
  (Ivory) y los paneles son superficie sólida casi blanca. Ya no hay
  `backdrop-filter` en `.anc-panel` — el archivo lo anula. Eso además mejora el
  rendimiento en móvil, que era el punto más caro del diseño anterior.
- **Lo que separa las tarjetas es la sombra**, no el contraste de superficies:
  entre el fondo y la tarjeta hay unos siete puntos. Si alguna vez hubiera que
  bajar las sombras, la salida es devolverle calidez al fondo, no subirlas más.
- **El blanco de las tarjetas no es `#FFFFFF`.** Un blanco puro junto a un fondo
  cálido se percibe azulado. No «corregirlo».
- **El texto sobre Obsidian es marfil, no blanco.** El blanco sobre negro produce
  halación.
- El modo oscuro viene incluido y también cambia de paleta.

**Los tres estados de confirmación son la única excepción al monocromo.** Y la
forma se conserva siempre además del color: círculo relleno con check = confirmó,
contorno = pendiente, tachado = no puede. **No quitar la forma porque ya hay
color** — cerca del 8% de los hombres no distingue rojo de verde.

---

## 12 · Pantalla Home (nueva)

**Archivos:** `components/home/Home.tsx` + `app/home.css`
**Referencia visual:** `docs/mockup-home.html`

Es la nueva pantalla de inicio para líderes y admins. Seis bloques:

1. **Próximo servicio** — tarjeta oscura con convocados / confirmados / sin
   cubrir, y acción para recordar a los pendientes.
2. **Calendario del mes** — punto en los días con servicio o ensayo.
3. **Necesita atención** — lista de cosas que hacer, ordenadas por urgencia, cada
   una con su acción. Es el corazón del Home, no un resumen decorativo.
4. **Próximos servicios** — los dos siguientes.
5. **Cumpleaños** — quien cumple hoy en bloque oscuro con botón de saludar; el
   resto del mes como lista. **Si no hay nadie hoy, el bloque oscuro no se
   renderiza.**
6. **Nómina por equipo** en pestañas — muestra quién viene al próximo servicio,
   no la lista de integrantes del equipo.
7. **Dos gráficos** — ver abajo.

### Los gráficos, y el límite

- **«Respuesta por equipo»** mide al equipo, no a las personas: cuánta gente
  contesta la convocatoria. Un equipo con 40% de «no respondió» tiene un problema
  de comunicación.
- **«Cómo se reparte la carga»** muestra cuántas veces sirvió cada persona en tres
  meses, ordenado de más a menos. **El dato valioso está abajo:** quién no ha
  servido nunca, quién está quedando fuera de la rotación.

**NUNCA agregar un porcentaje de cumplimiento ni un puntaje de confiabilidad
individual.** «Claudia, 8 veces» es un hecho de distribución. «Claudia cumple el
72%» sería una evaluación de desempeño sobre una persona voluntaria, y ahí la app
cambia de naturaleza. No agregarlo aunque sea trivial de calcular.

### Conexión con lo que ya existe

Cada nombre de persona del Home abre el `PersonDrawer` vía
`usePersonDrawer().open(id)`. Aplica a los cumpleaños y a la lista de carga.

---

# ══ LOTE 2 ══ (puntos 13 a 19)

## 13 · Dos destructivas sueltas que quedaron del lote anterior

`TeamPanel.tsx:399` («🗑️ Eliminar» visible en la barra del perfil) y
`ServicePanel.tsx:78` (🗑 rojo visible). Ambas violan la regla del punto 2:
las acciones destructivas van en el menú `⋯`, nunca visibles en la fila.

Además, los emoji de tacho se reemplazan por iconos de `lucide-react`.

---

## 14 · Roles de organización

Hoy solo existe `team_members.is_leader`, que es liderazgo **de un equipo**.
Falta la capa de organización.

```sql
create table organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  person_id       uuid references <TABLA_DE_PERSONAS>(id) on delete cascade,
  role            text not null check (role in ('owner','admin','member')),
  primary key (organization_id, person_id)
);
```

**Matriz de permisos:**

| | Owner | Admin | Líder de equipo | Integrante |
|---|---|---|---|---|
| Nombrar admins, borrar la organización | ✓ | | | |
| Crear y editar servicios (fecha, setlist, estructura) | ✓ | ✓ | | |
| Administrar cualquier equipo | ✓ | ✓ | | |
| Administrar **su** equipo (agregar, quitar, posiciones) | ✓ | ✓ | ✓ | |
| Asignar personas a los slots de **su** equipo en un servicio | ✓ | ✓ | ✓ | |
| Ver y confirmar | ✓ | ✓ | ✓ | ✓ |

**La distinción clave:** el líder de Alabanza llena su nómina, pero no cambia
la fecha, ni el setlist, ni la estructura, ni toca a Producción.

`/home` hoy está restringido a admins. Con esto pasa a ser accesible también
para líderes, mostrándoles solo lo de su equipo.

---

## 15 · Home v2 — layout y calendario útil

**Referencia visual:** `docs/mockup-home-v2.html`

- **Se van los huecos.** La segunda fila pasa de dos columnas desparejas a tres
  iguales: Necesita atención · Próximos servicios · Cumpleaños.
- **El calendario se achica casi a la mitad**: celdas menores, sin leyenda al
  pie, encabezados de día a 8px.
- **El hero gana un cuarto número: canciones.** Un servicio con 0 items es un
  problema tan grande como uno sin gente.
- **El calendario pasa a ser interactivo.** Al tocar un día se abre un panel
  debajo con el servicio de esa fecha (con acceso directo) y quién bloqueó ese
  día.

**La regla del panel de bloqueos:** se separa en dos grupos. Las personas **del
equipo de quien mira**, con nombre y posición. El resto, **solo como conteo**
(«2 personas de Producción y 1 de Logística»).

Un líder de Alabanza necesita saber que Cristopher no está el 6; no necesita el
detalle de quién falta en Logística. Sin esa separación el calendario se
convierte en un registro de ausencias de gente que no administra.

Dos marcas distintas por día: **punto abajo** = hay servicio o ensayo,
**cuadrito arriba a la derecha** = alguien bloqueó esa fecha. Pueden coincidir.

---

## 16 · Tipos de servicio · se elimina «Ensayo» del menú

**Referencia visual:** `docs/mockup-home-v2.html` (modal al final)

«Ensayo» sale del menú superior. Todo vive en **Servicios**. Al crear uno, lo
primero que se elige es el tipo: **Servicio**, **Ensayo** u **Otro**.

**La decisión de modelo:** un ensayo **no es independiente, pertenece a un
servicio**. Hereda sus canciones y su nómina, así no hay que convocar dos veces
a la misma gente ni mantener dos setlists en paralelo.

```sql
alter table services add column kind text not null default 'service'
  check (kind in ('service','rehearsal','other'));
alter table services add column parent_service_id uuid references services(id);
-- parent_service_id solo tiene sentido cuando kind = 'rehearsal'
```

Al elegir «Ensayo» en el formulario aparece un campo para indicar de qué
servicio depende. «Otro» no hereda nada y no exige setlist.

Migrar los ensayos existentes a `kind='rehearsal'` enlazándolos al servicio más
cercano, o dejándolos sin padre si no se puede determinar.

---

## 17 · El selector de Lead solo muestra a quien está en ese servicio

En el orden del servicio, el desplegable de **Lead** hoy lista a todas las
personas. Debe listar **solo a quienes están asignados a ese servicio en una
posición de voz**.

Si las voces del domingo son Juan, Pedro y María, esas son las tres opciones.
No todo el repertorio de cantantes de la organización.

Fuente: las asignaciones de ese servicio filtradas por las posiciones de la
sección Voces del equipo correspondiente.

---

## 18 · Resumen del servicio: lista, no selectores

**Referencia:** la pestaña «Resumen» de un servicio.

Hoy muestra selectores desplegables por posición, iguales a los de la pestaña
de edición. **El Resumen es para consultar, no para editar.**

Debe mostrar **una tarjeta por equipo** con la lista final de quienes
confirmaron — sin desplegables, sin posibilidad de mover gente. El formato de
«Equipo del domingo» que ya está abajo, pero separado por equipo.

Las vacantes y los pendientes se muestran como texto, no como control editable.
Para modificar, se va a la pestaña del equipo.

---

## 19 · Espaciado de la columna Tono en el orden del servicio

**Referencia:** captura del orden del servicio. La columna Tono queda pegada al
chevron y sin aire respecto a Links y Lead. Revisar los anchos de
`.anc-col--key` y sus vecinas contra `docs/mockup-admin-editorial.html`.

---

# ══ LOTE 3 · Ajustes estéticos ══ (puntos 22 a 24)

**Referencia visual de los tres:** `docs/mockup-servicio-ajustes.html`

## 22 · «Nuevo servicio» en una sola línea

Al crear un servicio, el selector de tipo (Servicio / Ensayo / Otro) muestra una
descripción bajo cada opción y eso lo hace muy alto.

- Las descripciones pasan a `title` (tooltip). No se muestran en la tarjeta.
- Selector segmentado (`.anc-seg`), no tarjetas.
- Campos de 30px de alto, con la etiqueta chica arriba (8px).
- Todo en una fila: Tipo · [Depende de] · Fecha · Hora inicio · Hora fin · Crear · ✕.
- «Depende de» aparece en esa misma fila solo cuando el tipo es Ensayo, y baja a
  una segunda línea únicamente si no cabe.

## 23 · «+ Posición» descuadrado

En Equipos › Integrantes, el botón del riel de posiciones muestra el «+» arriba
a la izquierda y la palabra centrada abajo.

**Ojo: es el botón del riel, NO `.anc-btn`.** El punto 9 arregló «Agregar a
equipo» y este quedó sin tocar. Buscá el que está al pie de la lista de
posiciones.

Corrección: `display:inline-flex; align-items:center; gap:6px; white-space:nowrap`,
con el ícono de ancho fijo (13px) dentro del mismo botón.

## 24 · Posiciones del servicio agrupadas, estilo Planning Center

Hoy una posición con varios cupos se repite: «VX1, VX1, VX1». Debe verse como un
grupo.

- **Un grupo por posición.** Cabecera con el NOMBRE COMPLETO («Voces»), no el
  código («VX1»). Banda hundida de 34px, con `n/total` al lado.
- Debajo, una fila por persona asignada: avatar + nombre + punto de estado.
- Las vacantes son **UNA sola fila** con un número («2 sin asignar»), no una fila
  por cupo. Al hacer clic abre el selector de persona.
- **Stepper − N +** a la derecha de la cabecera. Invisible en reposo, aparece al
  pasar el mouse (o `:focus-within`). Debe **reservar su ancho siempre**, para
  que nada salte al hacer hover. En `@media (hover:none)` queda visible.
- El **−** se deshabilita cuando `slots <= max(1, personas asignadas)`. No se
  pueden quitar cupos que ya tienen a alguien: primero se libera a la persona.
- La vacante usa un chip NEUTRO de borde punteado. **No el rojo:** el rojo ya
  significa «declinó», y una vacante no es un rechazo.

Dato: `service_position_slots.slots_needed` ya es la fuente. Probablemente el
cambio sea solo de presentación (agrupar por posición), no de esquema. Confirmalo
antes de crear una migración.

---

# ══ LOTE 4 · Plantillas ══ (punto 25)

**Referencia visual:** `docs/mockup-plantillas.html`
**Va en su propia sesión, DESPUÉS de los puntos 22 a 24.** Toca esquema.

## 25 · Plantillas por herramienta

Se pueden guardar la estructura de una herramienta como plantilla y aplicarla en
otro servicio. Herramientas cubiertas: **Cronograma, Checklist y Orden del
servicio** (sin canciones).

### Reglas de diseño, todas decididas

1. **Una plantilla guarda ESTRUCTURA, nunca personas.** No es «Duplicar»: eso
   copia el domingo entero con banda y setlist. Son cosas separadas.
2. **Las horas del Cronograma se guardan RELATIVAS al inicio** (`offset_min`:
   -60, 0, +75), no como hora fija. Al aplicar, se calculan con la hora de inicio
   de ese servicio. Así una plantilla sirve para un domingo a las 10:00 y otro a
   las 11:00. En el Checklist, al aplicar, todo entra sin marcar.
3. **Se aplica como COPIA, no como vínculo vivo.** Editar la plantilla no cambia
   los servicios ya creados. Guardá en el servicio de qué plantilla vino
   (`applied_template_id`, nullable) solo para mostrar el rótulo y habilitar
   «Actualizar».
4. **Orden del servicio:** se conservan los bloques fijos (Bienvenida, Ofrenda,
   Palabra, Cierre) y en el lugar de las canciones queda un marcador «Bloque de
   canciones». Las canciones NO se guardan en la plantilla.
5. **Predeterminada por tipo de servicio.** Cada herramienta puede tener una
   plantilla predeterminada por `kind` (`service` / `rehearsal` / `other`). Al
   crear un servicio de ese tipo, la herramienta nace ya armada. Una sola
   predeterminada por (herramienta, tipo): un índice único parcial lo garantiza.
6. **Permisos:** solo owner y admin crean, editan y eliminan plantillas. Los
   líderes de equipo no (no tocan la estructura del servicio).

### Menú `⋯` de cada herramienta (dentro de su cabecera)

- **Aplicar plantilla…** → selector. Si la herramienta tiene contenido, pregunta
  *Reemplazar* o *Agregar al final*. Si está vacía, aplica directo sin preguntar.
- **Guardar como plantilla**
- **Actualizar «{nombre}»** → lleva los cambios del servicio a la plantilla.
  Deshabilitado (con el motivo a la vista) si no hay una aplicada.
- Separador, y al final la destructiva: **Vaciar**.

En el selector, cada plantilla tiene su propio `⋯` con: renombrar, cambiar la
predeterminada, eliminar.

### Antes de tocar nada

**No conozco cómo están guardadas hoy las herramientas.** Mapealo primero: qué
tabla o columna guarda el Cronograma, el Checklist y el Orden. El modelo de abajo
es una propuesta, ajustalo a lo que exista:

```sql
create table if not exists tool_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  tool            text not null check (tool in ('schedule','checklist','order')),
  name            text not null,
  content         jsonb not null,   -- items con offset_min, texto, orden
  default_for_kind text check (default_for_kind in ('service','rehearsal','other')),
  created_by      uuid,
  created_at      timestamptz default now()
);
create unique index if not exists tool_templates_default_uq
  on tool_templates (organization_id, tool, default_for_kind)
  where default_for_kind is not null;
```

RLS con `is_org_admin`. Migración idempotente (la 023 falló por no serlo).

**Dame el plan en 10 líneas antes de implementar.** Y el selector de tipo del
punto 22 es donde se dispara la aplicación de predeterminadas: coordinalo con eso.

---

# ══ LOTE 5 · Personas, Admins y alta de personas ══ (puntos 26 a 28)

**Referencia visual:** `docs/mockup-agregar-persona.html`

## 26 · «Admins» pasa de ítem del menú a pestaña de Personas

**Síntoma:** el ítem «Admins» aparece en unas pantallas y en otras no (en Home
no sale; en el resto sí). Cada pantalla arma su propio menú.

**Corrección:**
- El menú termina en **Chat · Personas**. «Admins» deja de ser un ítem, en TODAS
  las pantallas, y se saca de `ADMIN_MENU_ITEMS`. No muevas la línea vertical ni
  reordenes ningún otro ítem.
- Personas pasa a tener **tres pestañas: Personas · Equipos · Admins**. Mismo
  patrón de pestañas, y el título y el botón primario siguen a la pestaña.
- **La pestaña Admins la ve SOLO el owner**, con la misma condición que usa hoy
  el ítem. Para un admin que no es owner la pestaña NO EXISTE: no se muestra
  deshabilitada, no se renderiza. No amplíes ni recortes quién puede nombrar
  administradores: solo cambia de lugar.
- Compatibilidad: `?tab=admins` abre Personas con la pestaña Admins. Si quien
  llega no es owner, cae en la pestaña Personas, en silencio.
- No cambies el contenido de `AdminsPanel`. Si ya tiene su propia acción de
  alta, exponela con una prop opcional (`onRequestNew`), igual que en los otros
  paneles. Si no la tiene, la pestaña no lleva botón primario.

## 27 · Dos botones «Agregar persona» en la pestaña Personas

Hay uno en el encabezado de la página (junto al título) y otro en el cuerpo de
la pestaña. **Eliminá el del cuerpo y dejá solo el del encabezado.**

El del encabezado dispara la misma acción que ya disparaba el del cuerpo (la
prop `onRequestNew` de `TeamPanel`). Después de este punto esa acción abre el
pop-up del punto 28.

## 28 · «Agregar persona» como pop-up minimalista

Hoy es un formulario grande y tosco en el centro de la pantalla. Pasa a ser un
pop-up centrado.

- **400px de ancho, campos de 32px de alto**, título de 15px, un solo botón
  primario. En <620px se convierte en una hoja que sube desde abajo.
- **Este diseño es un modelo visual. Los CAMPOS son los que tiene hoy el
  formulario: no agregues ni quites ninguno, y no cambies validaciones ni la
  lógica de guardado.** Solo se mueven de lugar.
- Visibles siempre: nombre, apellido, correo, teléfono. El resto de los campos
  del formulario actual va bajo **«Más datos»**, que se despliega animando
  `grid-template-rows` de 0fr a 1fr (no `max-height` a ojo).
- **«Agregar otra al guardar»**: interruptor en el pie. Encendido, al guardar se
  vacía el formulario, el cursor vuelve al primer campo y aparece un aviso breve
  («Se agregó Ana Pérez»). Apagado, el pop-up se cierra al guardar.
- **Errores en el campo**, nunca en `alert()`: borde y texto en `--anc-no`,
  `aria-invalid`, mensaje bajo el campo. Casos: falta el nombre, falta el
  correo, correo con formato inválido, y correo que ya existe en la
  organización («Ya existe una persona con ese correo»).
- Enter envía. Escape cierra. Tocar el fondo cierra SOLO si el formulario está
  vacío: un clic de más no puede borrar lo que la persona ya escribió.
- Foco inicial en el primer campo. Al cerrar, el foco vuelve al botón que lo
  abrió. Respetar `prefers-reduced-motion`.
- Mismos tokens `--anc-*` y mismas sombras que el resto. Nada de colores sueltos.

Alcance: SOLO «Agregar persona». «Agregar equipo» y el resto de Equipos quedan
como están.

## 29 · Botón primario del encabezado de Personas: versión compacta

**Referencia visual:** `docs/variantes-boton-agregar.html`, opción **A**.

El botón «Agregar persona» del encabezado es muy grande. Pasa a la versión
compacta, que es la misma en las tres pestañas (Personas, Equipos, Admins).

- **28px de alto** (hoy 32), `padding: 0 11px 0 9px`, `gap: 6px`, fuente
  `.71875rem`, radio `--anc-r`, fondo `--anc-accent`, texto `--anc-on-accent`.
- **Ícono «+» de 12px dentro del botón**, y la etiqueta CORTA que sigue a la
  pestaña: «Persona» / «Equipo» / «Admin». El `aria-label` conserva la frase
  completa («Agregar persona», «Agregar equipo», «Agregar admin»).
- **Siempre `display:inline-flex; align-items:center; justify-content:center;
  white-space:nowrap`.** Esa es la causa del «+ Posición» descuadrado: que el
  ícono y la palabra no compartan línea.
- **Hover:** un punto más claro, derivado de `--anc-accent` con `color-mix`.
  Sin hex suelto. `:active` con `scale(.97)`. `:focus-visible` con contorno de
  2px. Transiciones de 140ms y respeto a `prefers-reduced-motion`.
- **Área de toque:** bajo `@media (pointer:coarse)` el botón conserva su aspecto
  de 28px pero su zona clicable se amplía a unos 40px con un pseudo-elemento
  `::before { inset: -6px }`.
- Implementalo como **modificador del sistema de botones** (`.anc-btn--sm`), no
  como una clase suelta de esa pantalla.

Alcance: SOLO este botón. NO toques el «Guardar» del pop-up del punto 28 (queda
en 32px, acompañando a sus campos), ni «+ Posición», ni «+ Añadir» de las
herramientas. Si la pestaña Admins no tiene acción de alta (punto 26), no lleva
botón.

---

# ══ LOTE 6 · Disponibilidad y conflictos entre equipos ══ (puntos 30 a 33)

**Referencia visual:** `docs/mockup-disponibilidad-equipos.html`

## Lo que dejó el mapeo (léelo antes de tocar nada de este lote)

- `invitations` es **una fila por (servicio, persona)**, con `unique(service_id,
  member_id)`. NO tiene equipo ni posición. Una persona en dos equipos del mismo
  servicio tiene UNA sola invitación y la acepta o rechaza entera.
- Por eso «aceptar en un equipo y quedar declinada en los otros» (sección 3 del
  mockup) **no se puede representar hoy**. El mockup es el DESTINO de la fase 2,
  no algo construible sobre el esquema actual.
- El equipo de una persona en un servicio se deduce por NOMBRE de posición
  (`banda_assignments.posicion` contra `team_positions.name`). Es frágil.
- `date_blocks` solo la escribe el portal (vía `/api/date-blocks`). Desde el lado
  admin no hay ninguna escritura, y la tabla no está en ninguna migración.
- Las políticas RLS de `invitations` y otras son `for all using (true)`.

## FASE 2 · se diseña junto con el portal del músico (lado del usuario)

**30 · Bloqueos por equipo** y **31 · Una confirmación por persona y horario**
quedan DIFERIDOS. Sin portal rediseñado no hay quien los escriba, y construir
las migraciones antes sería armar columnas que nadie usa. Las reglas decididas
se conservan para ese diseño:

- Bloqueo con `team_id` opcional; NULL = todos los equipos (es lo que significan
  hoy las filas existentes, no hay backfill). Cada líder ve a la persona como
  no disponible solo si el bloqueo aplica a SU equipo, y nunca puede deducir en
  qué otros equipos bloqueó.
- Convocatoria por equipo (`invitations` con `team_id`). Al aceptar en uno, las
  demás pendientes que se solapen en horario pasan a `declinado` con
  `declined_reason='conflict'` y `superseded_by`. Es reversible, aplica en la
  base (con bloqueo contra carreras), se ve «Aceptó en {equipo}» y NO cuenta como
  «No pudo» en ningún historial ni conteo.
- Antes de implementarlo: filtrar `trg_notify_rsvp_change` para que no avise
  «no podrá asistir» por una declinación por conflicto.
- Pendiente de decisión: interruptor por equipo «se puede combinar con otros
  equipos» (por ejemplo Montaje).

## 32 · AHORA · Aviso al asignar, sin cambios de esquema

Es la versión de este lote que sí se puede hacer hoy con los datos que existen.

- En el selector para asignar a una posición, cada persona muestra:
  **Disponible**, **Bloqueó este día** (usando `date_blocks.blocked_date`, NO
  `service_id`) o **Ya asignado en {equipo}** (a partir de `banda_assignments`
  del mismo servicio, cuando el equipo es distinto al de quien asigna).
- Se avisa, NO se impide: el líder decide. Disponibles primero.
- Se nombra el equipo de la asignación (es información que la organización ya
  ve en el servicio). Nunca se muestran bloqueos de otros equipos.
- **Corregí de paso** el marcado de «bloqueados» del selector de servicio de
  `app/admin/page.tsx` (~línea 292): hoy usa `date_blocks.service_id` y no ve los
  bloqueos creados antes que el servicio ni con dos servicios el mismo día.
- ANTES de implementar: consulta de solo lectura que busque nombres de posición
  repetidos entre equipos distintos. Si los hay, el aviso «Ya asignado en
  {equipo}» es ambiguo para esos nombres: decime cómo lo resolvés.

## REGLA · Varias posiciones dentro de un MISMO equipo (vale para el 32 y la fase 2)

Una persona puede ser convocada a más de una posición del mismo equipo en un
servicio (voz y guitarra acústica; guitarrista y MD). NUNCA es un conflicto.

- **32:** el aviso «Ya asignado en {equipo}» aparece solo si el equipo es
  DISTINTO. Dentro del mismo equipo, una etiqueta neutra «Ya tiene {posición}»,
  sin color de alerta.
- No se puede asignar a la misma persona dos veces a la MISMA posición (dos cupos
  de «Voces»): excluirla del selector de esa posición.
- **Conteos:** «convocados», «confirmados» y «servicios este año» cuentan
  PERSONAS y SERVICIOS distintos, no asignaciones. Una persona con dos posiciones
  en un servicio cuenta 1. «Sin cubrir» sigue contando cupos. Revisar el hero del
  Home, «Cómo se reparte la carga», PersonDrawer y StatsPanel.
- **Historial** (PersonDrawer): una fila por servicio y equipo, con las
  posiciones juntas («Voz 1 · Guitarra acústica»), no una fila por posición.
- Una invitación por persona y servicio cubre todas sus posiciones del equipo:
  es lo que ya hace el modelo. En la fase 2 la confirmación de un equipo cubre
  TODAS sus posiciones en ese equipo. Pendiente de decisión: si se puede aceptar
  solo una de las dos.
- Leer `trg_flag_reassignment_if_changed` e informar qué ocurre al agregar una
  segunda posición a alguien que ya confirmó. No cambiarlo sin consultar.

## 33 · AUDITORÍA DE SEGURIDAD · solo lectura, no cambiar nada

Las políticas `for all using (true)` dejan que cualquiera con la llave pública
(que viaja en el navegador) lea y escriba esas tablas.

Informá, sin modificar nada:
1. Qué tablas tienen políticas abiertas a anon y qué cmd permiten.
2. Qué datos sensibles exponen: correos, teléfonos, fechas de nacimiento y, sobre
   todo, **si los tokens del portal viven en esas tablas** (invitations,
   members). Si se pueden leer, alguien podría abrir el portal de otra persona.
3. Qué rutas y componentes escriben con la anon key.
4. Un plan para cerrarlo SIN romper el portal (por ejemplo, que las rutas de
   servidor usen la llave de servicio y la anon quede de solo lo necesario).

---

# ══ LOTE 7 · Seguridad y datos heredados ══ (puntos 34 a 36)

## 34 · FASE DE SEGURIDAD · bloquea la migración del equipo real

**Hallazgos de la auditoría** (confirmados con conteos usando la anon key, sin
escribir nada):
- `invitations`: los tokens del portal de cada persona son LEGIBLES con la llave
  pública (42 tokens, 40 ya enviados). Con un token se abre el portal de esa
  persona y se responde su convocatoria.
- `members`: correos, teléfonos, fechas de nacimiento y direcciones legibles y
  escribibles. `members.id` es además la credencial de `/portal/member_<id>`, y
  `/api/portal-by-member` no pide autenticación.
- `messages` (incluidos los directos), `date_blocks` (con el motivo escrito por
  la persona), `availability` y `push_subscriptions`: legibles y escribibles.
- Posible toma de control de un admin (NO probada): `is_org_admin` resuelve el
  rol por `members.email` y `members` es escribible por anon.
- No existe llave de servicio en el repo: todas las rutas `/api` usan la anon.

**COMPUERTA:** ningún dato real del equipo ni invitaciones reales a personas
desde la plataforma nueva hasta completar la fase S3.

- **S0 · ahora, migración 027, pequeña:** trigger que impide cambiar
  `members.email` salvo a un admin con sesión (o con la llave de servicio).
  Cierra el vector de toma de control. Idempotente y reversible (`drop trigger`).
  ANTES: confirmar que el perfil del portal no edita el correo.
- **S1:** `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor (jamás `NEXT_PUBLIC`) y
  un cliente de servidor.
- **S2:** el lado del usuario y el portal rediseñado se construyen sobre rutas
  `/api` que validan el token en el servidor. Sin escrituras directas con anon.
  Chat por polling en vez de realtime anónimo. Credencial nueva para el músico
  (token secreto), no `members.id`. **Es el mismo trabajo que el rediseño del
  lado del usuario: NO parchear el portal viejo.**
- **S3:** cerrar políticas UNA tabla por vez, con prueba del portal. Orden:
  `invitations` (sin SELECT para anon), `members`, `messages` y `chat_presence`,
  `date_blocks` y `availability`, `push_subscriptions`; borrar `admin_emails`
  (legado); el resto con el patrón `is_org_admin` / `is_any_team_leader` de la 023.
  Storage: portadas sin subida anónima. Al final, rotar los tokens y reemitir
  los enlaces.

## 35 · Posiciones con códigos viejos

55 de las 78 asignaciones usan códigos antiguos (`VX1`, `AG1`, `SONIDO1`…) que no
existen en `team_positions`. No se pueden atribuir a un equipo: los avisos del
punto 32 caen a la etiqueta neutra y la nómina por equipo no las ve. También
conviven `bass`, `Bass` y `BASS` (dos archivadas).

Antes de migrar al equipo real: consulta de solo lectura con los códigos
distintos y cuántas asignaciones tiene cada uno, y luego una migración de mapeo
código → posición.

## 36 · Bandera de reconfirmación

Agregar una segunda posición, aunque sea del MISMO equipo, a alguien que ya
confirmó pone `needs_reassignment_confirm = true` («Tu rol cambió — aún no
confirmas»). Hipótesis a verificar en un servicio de prueba: si la persona vuelve
a confirmar en el portal sin que el admin reenvíe, la bandera queda puesta para
siempre. Si se confirma, corregirlo en `/api/confirm-rsvp` (no en `app/portal`):
al confirmar, bajar la bandera y refrescar `confirmed_posiciones`.

---

## Orden de trabajo

Hacer en este orden y **parar después de cada bloque** para mostrar:

1. ~~Puntos 11 y 12 — paleta y Home.~~ **HECHO**
2. ~~Puntos 1, 2, 3, 4, 9, 10 — arreglos de interfaz.~~ **HECHO** (commit 10d6a0d)
3. **Bloque 3 · Canciones** — puntos 5, 6, 7, 8. El más grande: esquema, parser
   y flujo de creación. Merece una sesión completa.
4. **Bloque 4 · Ajustes de interfaz** — puntos 13, 15, 17, 18, 19. Rápidos.
5. **Bloque 5 · Modelo** — puntos 14 y 16. Roles de organización y tipos de
   servicio. Los dos tocan esquema, van juntos y al final.

---

## Verificación al terminar

```bash
# 1 · ningún ⋯ suelto fuera de un panel o una fila
grep -rn "anc-rowMore" components/ | head -30

# 2 · ninguna acción destructiva fuera de un menú
grep -rniE "eliminar|borrar|trash" components/ --include=*.tsx | grep -v rowMore

# 3 · sin mayúsculas forzadas en títulos
grep -rn "text-transform" app/ components/ --include=*.css

# 4 · sin colores sueltos
grep -rn "#[0-9a-fA-F]\{3,6\}" components/ --include=*.tsx

# 5 · la paleta nueva se está importando en el orden correcto
grep -n "import" app/layout.tsx

# 6 · ningún porcentaje de cumplimiento individual
grep -rniE "cumplimiento|confiabilidad|asistencia.*%|reliability" components/

# 7 · el Home es el mío
grep -rn "anc-bdayToday\|anc-stDot" components/
```

Todos deberían salir limpios o solo con resultados esperados. El 6 tiene que
salir vacío.

---

## Mensaje para pegar

> Lee `docs/PENDIENTES-code.md` completo. Son 12 puntos acumulados.
>
> Instala tal cual, sin modificarlos:
> `app/ancora-tokens-v4.css`, `app/home.css`, `components/home/Home.tsx`.
> El CSS se importa desde `app/layout.tsx` en el orden que indica el punto 11.
>
> Trabaja en el orden de la sección «Orden de trabajo» y **pará después de cada
> bloque** para mostrarme antes de seguir. No hagas los 12 puntos de una.
>
> No reimplementes `chords.ts` ni `parseChart.ts`. No agregues porcentajes de
> cumplimiento individual. No escribas JSX de las pantallas que vienen como
> componente.
>
> Al terminar cada bloque, corre los greps de la sección de verificación y
> muéstrame la salida.
