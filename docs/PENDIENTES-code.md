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

# ══ LOTE 8 · Alta de personas dirigida a equipos ══ (puntos 37 a 39)

## 37 · El pop-up «Agregar persona» ofrece EQUIPOS, no instrumentos

Hoy el pop-up muestra los 10 instrumentos fijos (AG, EG, Piano…): son las
«posiciones antiguas». La idea es que la persona nazca dirigida a sus equipos y
que las posiciones se asignen después, dentro de cada equipo, en la pestaña
Equipos.

- Campo **«Equipos»**: chips multi-selección con los equipos reales de la
  organización, leídos de la base (nunca una lista fija en el código). Excluir los
  archivados si existe esa marca. Texto de ayuda: «Después le asignas posiciones
  desde Equipos».
- Al guardar: `insert` en `members` y luego una fila en `team_members` por cada
  equipo elegido. Sin posiciones: las posiciones se asignan en Equipos.
- **Fallo parcial:** si la persona se crea pero falla agregarla a un equipo, NO
  cierres en silencio ni digas «Se agregó». Mostrá «La persona se creó, pero no
  se pudo agregar a {equipo}. Agrégala desde Equipos».
- **Los instrumentos NO se borran.** Alimentan `esConvocableAEnsayo`
  (`lib/equipos.ts`), que decide a quién se convoca a ensayo. Una persona sin
  instrumentos no recibiría convocatorias a ensayo. Pasan a «Más datos», con la
  etiqueta «Instrumentos (para convocatorias a ensayo)». Cuando las
  convocatorias se rediseñen, esto se derivará de los equipos y posiciones.
- ANTES de implementar: confirmá que la lista de Integrantes de un equipo muestra
  a quien es miembro pero aún no tiene ninguna posición (el filtro «Todos los
  integrantes»). Si esa lista se arma a partir de `team_member_positions`, estas
  personas no aparecerían: PARÁ y decímelo.

## 38 · «Editar» vive en el panel de la persona, no en el menú ⋯

Al abrir una persona (PersonDrawer) no hay forma de editarla ahí dentro.

- Botón **«Editar»** en las acciones del panel, junto a «Asignar a un servicio».
- Se **saca «Editar» del menú ⋯** de la fila. El menú conserva solo lo que ya
  tenía (la acción destructiva, al final).
- **«Editar» abre el MISMO pop-up del alta, en modo edición**, con los datos
  cargados. El formulario inline grande de hoy quedaría detrás del panel y
  forzaría a cerrarlo: ese camino no sirve.
- Mismos campos y misma lógica de guardado que hoy. El pop-up de edición queda
  POR ENCIMA del panel (revisá el apilamiento: mismo problema que ya tuvimos con
  otros menús). Tras guardar, el panel y la lista se refrescan con los datos
  nuevos.
- Visible solo si quien mira puede editar (`canEdit`): un líder sigue sin verlo.
- La protección del correo (trigger de la 027) sigue vigente: un admin con sesión
  puede cambiarlo, cualquier otro recibe el error. Mostralo en el campo.

## 39 · Personas nuevas o editadas no aparecen en Equipos

Al agregar o editar a alguien en Personas, la pestaña Equipos y el selector de
asignar no se actualizan. Hipótesis: la lista de `members` está desactualizada.
Confirmarlo leyendo el código. Si es de refresco: una sola fuente de verdad para
`members` en el padre, con una función de recarga tras cualquier alta, edición
o borrado, y UNA prop opcional (`onMembersChanged`) en `TeamPanel` y
`TeamsAdminPanel`. Si es un problema de DATOS (un campo que la persona nueva no
tiene y que la lista filtra), PARAR y avisar antes de arreglar.

---

# ══ LOTE 9 · Posiciones en vez de instrumentos, y decisiones nuevas ══ (punto 40)

## Decisiones tomadas (octubre 2026)

- **Ensayos en pausa.** No es prioridad. No se trabaja en ellos hasta nuevo
  aviso. NO se quita el tipo «Ensayo» de «Nuevo servicio» ni se toca su código.
- **Nadie usa todavía lo que se programa.** Se comparte con el equipo recién
  cuando esté terminado y se hayan visto la versión responsive y las vistas del
  usuario. Consecuencia: el portal SÍ se puede modificar sin riesgo de
  producción, y la COMPUERTA del punto 34 se aplica «antes de compartir».
- **Los calendarios** son: (a) bloquear fechas equipo por equipo y (b) aceptar
  la convocatoria de UN solo equipo. Los puntos 30 y 31 YA NO están diferidos:
  forman parte de la fase del lado del usuario, junto con la seguridad (34).
- **El conflicto entre equipos es ESTRICTO.** Solo se permiten varias posiciones
  dentro de un MISMO equipo. El interruptor «se puede combinar con otros
  equipos» queda DESCARTADO.
- **Las posiciones asignadas dentro de cada equipo son la única fuente de verdad**
  de «qué hace» una persona. Los instrumentos antiguos se retiran de la interfaz.

## 40 · Retirar los instrumentos de la interfaz

1. ANTES de cambiar nada: un grep de `instrumentos`, `ALL_INSTRUMENTOS`,
   `Instrument` y `SHORT` y la lista de TODOS los lugares donde la interfaz los
   muestra o los edita. Si algo toca el portal o la lógica de ensayos, mostrámelo
   antes de seguir.
2. Quitar de la interfaz de admin: los chips de instrumentos del pop-up de alta
   y edición (incluida «Más datos»), y las etiquetas de instrumentos en las
   filas, el perfil y el panel de la persona.
3. **En su lugar, mostrar las POSICIONES** asignadas en `team_member_positions`,
   agrupadas por equipo y en chips compactos (por ejemplo «Alabanza: Voces ·
   Acoustic Guitar»). Sin posiciones, no mostrar nada.
4. **NO borrar la columna `members.instrumentos`** ni ninguna migración. El
   `insert` y el `update` NO deben enviar esa clave: si se envía vacía, se pisan
   los valores existentes. Verificar que la columna admite quedar sin valor.
5. **Ensayos:** NO tocar `esConvocableAEnsayo`, `send-ensayo-invites` ni
   `EnsayoPanel`. Anotar en el README que la convocatoria por instrumento queda
   obsoleta y que, cuando se retome, debe derivarse de equipos y posiciones.
6. Limpiar las exportaciones de `lib/personForm.ts` que queden sin uso.

---

# ══ LOTE 10 · Paleta v5, tema y colores de equipo ══ (puntos 41 a 46)

**Referencia visual:** `docs/mockup-colores-equipo-v3.html`, con los controles en
**Fondo «Casi blanco»**, **Sombra «Media»** y **Visión «Normal»**.
**Va DESPUÉS del punto 40 (instrumentos) y de sus pruebas.** Un commit por punto.

## Decisiones tomadas

- Fondo casi blanco (`#FAFAFA`). La tarjeta es blanca y se despega por la
  SOMBRA, no por el contraste. Sombra de nivel «media».
- Tema: **Sistema / Claro / Oscuro**, y por defecto Sistema.
- Oscuro **«Más suave»**: fondo `#1E1E1E`, tarjeta `#2C2C2C`, fila resaltada
  `#363636`. NUNCA negro puro. La tarjeta destacada del Inicio es un gris elevado
  (`--anc-hero`), no un bloque blanco. Los tokens ya traen estos valores.
- Se diseña para visión normal, con redundancia para daltonismo: el estado se lee
  SIEMPRE por su forma, y cada equipo lleva un monograma además del color.
- Escala neutra: la de Tailwind Neutral. Colores de equipo: 7 colores modernos
  (Cobalto, Rosa, Violeta, Turquesa, Cielo, Naranja, Fucsia), con ese orden de
  asignación automática.

## 41 · Paleta v5: escala neutra, sombras y limpieza de colores cálidos

0. **Antes de instalar, verificá** que `docs/ancora-tokens-v5.css` sea la versión
   final: debe contener `--anc-hero` y el fondo oscuro `#1E1E1E`. Si no, PARÁ y
   avisá: no instales una versión vieja.
1. Instalá `ancora-tokens-v5.css` tal cual. **REEMPLAZA los valores de
   `ancora-tokens-v4.css`**: renombrá el archivo a v5, actualizá el import en
   `app/layout.tsx` y CONSERVÁ, sin tocar, el bloque «capa de compatibilidad
   temporal» del final de la v4 (los alias `--surface`, `--v3-*`…). Apunta a
   `--anc-*` y sigue funcionando.
2. El archivo ya trae las reglas de `.anc .anc-panel` y `.anc .anc-top` con los
   valores nuevos. **Borrá las versiones viejas de esas dos reglas** para que no
   haya duplicados.
3. **El anillo de 1px YA viene dentro de `--anc-e1`.** No le sumes un borde a las
   tarjetas. Campos, botones secundarios e interruptores SÍ conservan borde
   visible (`--anc-ring`).
4. **Limpiá los colores cálidos sueltos** que quedaron de la paleta marfil. Hacé
   este grep y reemplazá cada resultado por un token (`--anc-sunk`, `--anc-rule`,
   `--anc-ink-3`…):
   `grep -rniE "#(E7E2D6|EAE4D7|E0D8C7|E6D9BE|2A2722|F8F5EF|F2EEE4|E3DBCC|EDE7DA|FDFCF8|FFFFFE|F3F0E9|4A453C|6E6659|9A9082|D6CCB8)" app components --include=*.css --include=*.tsx`
   En `home.css` hay varios (pista de las barras, avatares, puntos de carga, trama).
5. **Texto secundario:** `--anc-ink-3` (#525252). `--anc-ink-4` (#737373) solo sobre
   blanco o en texto grande: sobre #F5F5F5 da 4,3:1 y no llega a AA.
   Revisá dónde se usa `--anc-ink-4` para texto pequeño sobre `--anc-sunk`.
6. La sombra sube un nivel al pasar el mouse sobre una tarjeta (ya lo hace
   `.anc-panel:hover`).
7. **Tarjeta destacada:** el «próximo servicio» del Inicio y el cumpleaños de hoy
   usan hoy `--anc-accent` como fondo, y en oscuro quedarían como un bloque blanco.
   Pasalos a `--anc-hero` (texto `--anc-on-hero`). Verificá los nombres reales de
   las clases con `grep -n "anc-accent" components/home.css`.

## 42 · Tema: Sistema, Claro u Oscuro

- Por defecto **Sistema**: `<html>` sin atributo `data-theme`, y el CSS sigue
  `prefers-color-scheme`. No hace falta JavaScript para eso.
- Control «Apariencia» con tres opciones. En el admin, en el menú del avatar o en
  los Ajustes; en el músico, en Perfil. **Reutilizá `useDarkMode` y la columna
  `members.theme`** que ya existen: extendelos a tres valores. Mapeá los valores
  actuales; si ya guardan `light` o `dark`, se respetan, y `null` pasa a ser Sistema.
- **Sin parpadeo:** además de `members.theme`, escribí una cookie espejo
  `anc-theme` (`light` o `dark`; para Sistema, borrá la cookie). El layout del
  servidor la lee y renderiza `<html data-theme="…">`. Con Sistema, sin atributo.
- Agregá `<meta name="color-scheme" content="light dark">` y dos
  `<meta name="theme-color">` con `media`: `#FAFAFA` para claro y `#1E1E1E` para
  oscuro (el fondo del tema oscuro, NO negro puro).
- Cambiar el tema NO remonta pantallas ni cierra paneles.
- Pruebas: forzar Claro, forzar Oscuro, y con Sistema cambiar la preferencia del
  sistema operativo.

## 43 · Color de equipo

**Instalá `lib/teamColors.ts` tal cual. No lo reimplementes.** Trae el orden de
asignación, las distancias ya calculadas y los avisos.

- **Migración** (siguiente número libre), **idempotente** y reversible:
  `alter table teams add column if not exists color text` con un `check` de las
  7 claves (`cobalto`, `rosa`, `violeta`, `turquesa`, `cielo`, `naranja`,
  `fucsia`). **Se guarda el NOMBRE del color, nunca el código.** Relleno: a los
  equipos sin color, asignales en el orden de `TEAM_COLOR_ORDER` según su
  antigüedad; no toques los que ya tengan.
- Al crear un equipo: `nextFreeColor(coloresEnUso)`.
- **Selector** en Equipos › Ajustes del equipo: 7 círculos, como en la sección 3
  del mockup. Se muestra el aviso de `colorWarnings`: mismo color, «se parece a
  {equipo}», o «se parece a {equipo} para quien tiene daltonismo». **Se avisa,
  NUNCA se impide.** Solo owner y admin.
- El elemento que representa al equipo lleva `data-team={color}` y hereda las
  variables. Dónde se usa: encabezado del equipo (franja y monograma), banda de
  cada equipo en Servicio, puntos del calendario del Home, etiquetas de posición
  (`.anc-teamChip`) y «Mis equipos y posiciones».
- Dónde NO: botones primarios, menú, tarjeta oscura, ni dentro de los gráficos
  del Home (usan los colores de estado; ahí, solo un punto junto al nombre).
- **El texto nunca lleva el color de equipo.** El nombre del equipo es gris
  oscuro de la escala neutra.
- Monograma = primera letra del nombre en mayúscula. Equipo sin color: neutro.
- **El estado se lee siempre por su forma.** No cambies los círculos de estado.

## 44 · Personas del administrador: lista + panel (alternativa D)

**Referencia visual:** `docs/mockup-personas-alternativas.html`, alternativa
**D · Lista + panel** (probá también «Teléfono»).
**Va DESPUÉS de los puntos 41 al 43**: usa los tokens v5 y el color de equipo.
Antes de implementar, plan en 6 líneas. Un commit.

**Estructura de la pantalla:** título «Personas» con el «+ Persona» compacto (ya
existe), pestañas (Personas · Equipos · Admins; Admins solo owner), buscador,
filtros por equipo y, debajo, la lista a la izquierda y la ficha a la derecha.

- **Filtros:** «Todos», un chip por equipo (monograma del color y conteo) y
  **«Sin equipo»** con conteo. Es la forma de encontrar a quien se acaba de crear.
  Sin consultas por fila: usá las listas que `/admin` ya carga.
- **Fila de la lista:** avatar con iniciales (neutro), nombre, una línea resumen
  (hasta 3 posiciones; si no hay posiciones, los nombres de sus equipos; si no
  está en ningún equipo, «Sin equipo» como etiqueta ámbar), puntos de color de sus
  equipos a la derecha y el menú `···` con SOLO «Eliminar persona…» (con la
  confirmación que ya existe). El correo y el teléfono van en la ficha.
- **Selección:** la fila seleccionada lleva fondo `--anc-sunk` y una marca de 3px
  a la izquierda. ↑ y ↓ mueven la selección. Si la persona seleccionada queda
  fuera del filtro, se selecciona la primera visible. `?person=<id>` conserva la
  selección. Sin resultados: «No hay nadie con ese filtro».
- **Ficha (derecha, fija, 400px, `position: sticky` bajo el menú):**
  **REUTILIZÁ el contenido de `PersonDrawer`**: extraelo a un componente
  compartido (`PersonDetail`) y usalo en el panel fijo y en el cajón existente.
  **NO lo dupliques.** Contenido: monograma grande, nombre y correo; acciones
  «Editar» (abre el pop-up de edición que ya existe). **NO hay «Asignar a un
  servicio»**: ese flujo no existe hoy (asignar vive dentro de cada servicio);
  sección EQUIPOS Y POSICIONES con una banda por equipo (monograma, nombre y
  etiqueta «Líder» si corresponde) y los chips de posiciones, o «Sin posiciones
  asignadas todavía»; si no está en ningún equipo, «Aún no está en ningún equipo»
  y el botón «Agregar a un equipo»; sección CONTACTO: correo, teléfono, cumpleaños.
- **Responsive:** con viewport de **1024px o más**, panel fijo. Por debajo, la lista
  ocupa todo el ancho y al tocar una fila se abre el cajón existente (a pantalla
  completa en teléfono, con «‹ Personas»).
- **Colores:** solo tokens `--anc-*` y `data-team`. El color de equipo nunca lleva
  texto. Los chips de posición llevan el tinte y el punto del equipo.
- **NO cambiar:** el pop-up de alta y edición, la lógica de guardado, los permisos,
  ni las pestañas Equipos y Admins.
- **Dos vistas de persona:** la «Vista de perfil» completa de `TeamPanel` pasa a
  `?profile=<id>` sin cambiar su comportamiento (tiene quitar posiciones, salir del
  equipo, «🔗 Portal», disponibilidad y la corona). Se llega desde «Ver perfil
  completo». **SUPERADO por el punto 46: se retira.**
- **Commit (c), después de probar el (b):** etiqueta «Admin» junto al nombre en la
  fila y en la ficha, SOLO para owner y admin (nunca para líderes ni en solo
  lectura), de solo lectura; sección «EN LA APP» en la ficha, solo owner/admin
  (última conexión en fecha relativa, «Nunca» si es null, y «App instalada»);
  foto de perfil (`avatar_url`) con iniciales de respaldo; búsqueda por correo y
  teléfono sin distinguir tildes ni mayúsculas; los puntos de color de la fila con
  `title` y `aria-label` con el nombre del equipo.

## 45 · Rol de administrador desde el pop-up de «Editar»

**Referencia visual:** `docs/mockup-personas-alternativas.html`, alternativa D
(probá el control «Vista como»: Propietario, Administrador y Líder, y pulsá
«Editar» en una persona). **Va DESPUÉS del 44, incluido su commit (c).**
Toca PERMISOS: primero LEER y plan en 6 líneas. NO cambies políticas ni RLS sin
consultarme. Un commit por parte, con pausa tras la primera.

**Qué se ve:**
- **Etiqueta junto al nombre** («Admin», «Propietario») en la fila y en la ficha:
  ya la trae el 44(c). NO la dupliques. Solo la ven owner y admin.
- **Pop-up de edición** (`AddPersonDialog` en modo edición, NO en el alta): una fila
  «ROL» con una **píldora pequeña** (26px), «Integrante ▾», y un mini-menú de dos
  opciones (Integrante, Administrador) con una línea que explica qué puede hacer
  cada una. No es una sección grande. **Elegir no aplica nada: el rol se aplica al
  guardar.** Si cambió, la píldora lleva un borde y debajo dice «Se aplicará al
  guardar, con una confirmación».
- **Alerta al guardar un cambio de rol**, con `role="alertdialog"`: título
  «¿Estás seguro de dar permisos de administrador a {nombre}?» (o «…de quitarle los
  permisos de administrador a {nombre}?»), cuerpo con lo que podrá hacer y con qué
  cuenta de Google entrará (el correo), botones «Cancelar» y «Sí, dar permisos» /
  «Sí, quitar permisos». **El foco empieza en «Cancelar»**; Escape cancela.
  Cancelar vuelve al pop-up SIN aplicar nada. Sin cambio de rol, guarda sin preguntar.
- **Liderazgo por equipo:** botón pequeño «Hacer líder» / «Quitar liderazgo» dentro
  de la banda de cada equipo en la ficha (owner y admin). Sin confirmación.
- **Filtro «Administradores»** junto a «Sin equipo», con conteo (owner y admin).

**Reglas de permisos (son las de hoy; NO las amplíes):**
- Solo el **propietario** nombra o quita administradores. **La píldora de rol del
  pop-up la ve SOLO el propietario**: para un administrador no se muestra.
- El propietario no se cambia desde aquí («El propietario no se cambia desde
  aquí»). Nadie cambia su propio rol («No puedes cambiar tu propio rol»). Nunca
  debe quedar la organización sin propietario.
- Un administrador y el propietario asignan líderes en cualquier equipo.
- Un líder no ve la píldora, ni «Editar», ni las etiquetas (como hoy).

**Guardado:** primero los datos (flujo actual), después el rol. Si los datos se
guardan y el rol falla, o el `update` afecta 0 filas (RLS), NO cierres el pop-up
como si todo hubiera salido bien: dejalo abierto, mostrá el error, y no repitas el
guardado de datos. Tras guardar bien, refrescá las listas del padre (`/admin`) para
que la etiqueta, el filtro y los conteos cambien sin recargar.

**ANTES de planificar, LEÉ sin cambiar nada:** cómo escriben hoy la corona de
administrador (`toggleAdmin` en `TeamPanel`) y la pestaña Admins (`AdminsPanel`): en
qué tabla (`organization_members`) y con qué política; si la política actual deja
escribir al propietario; y qué hacen hoy con una persona que aún no existe.

**Decisiones por defecto (confirmar):**
- **La pestaña Admins SE MANTIENE** (decisión de Claudia): **solo la ven los
  propietarios** y **ahí se da acceso a toda la aplicación**. NO se retira.
  **Verificá que escribe en `organization_members`**, la tabla que gobierna el
  acceso (`is_org_admin`), y no solo en `team_admins`: si hoy solo escribiera en
  `team_admins`, la pestaña PARECERÍA dar acceso sin darlo. Si es así, PARÁ y
  decímelo antes de seguir.
- **La píldora de rol del pop-up es un atajo a la MISMA acción** que la pestaña
  Admins: una sola función compartida (`setOrgRole`), nunca dos escrituras
  distintas. Ambas dejan el mismo resultado, y las dos listas se refrescan.
- **Avisos a los administradores (`team_admins`):** `app/api/rsvp-notify` lee
  `team_admins` (`team_id` null) para saber a quién avisar cuando alguien confirma o
  declina un servicio. `setOrgRole` escribe PRIMERO `organization_members` (la que da
  acceso) y DESPUÉS mantiene `team_admins` (`team_id` null) sincronizada. Si la
  segunda falla, avisá «Se dieron permisos, pero no se actualizó la lista de avisos»
  y NO reviertas el acceso. Es un parche temporal: se retira cuando `rsvp-notify`
  lea `organization_members` (necesita la llave de servicio: fase de seguridad).
  **COMPUERTA: no compartir la app con el equipo sin esto.** La pestaña Admins
  también debe pasar por `setOrgRole`.
- **Se implementan las DOS formas a propósito** (decisión de Claudia: probar ambas y
  retirar la que no convenza). Por eso: UNA sola función `setOrgRole` con TODA la
  lógica (escritura de `organization_members`, sincronización de `team_admins`,
  manejo de errores y de 0 filas, refresco de listas), y cada interfaz (pestaña
  Admins y píldora del pop-up) es una pieza DELGADA que solo la llama. Retirar una
  de las dos debe ser borrar esa pieza, sin tocar la función ni la otra. Que
  ninguna interfaz contenga lógica de permisos propia.
- **«Editor» NO existe y queda fuera:** sería un nivel nuevo (migración, permisos y
  reglas) y hay que decidir qué puede hacer. Diseñarlo aparte si hace falta.
- **Registro de cambios de permisos** (quién cambió qué y cuándo): mejora posible,
  NO incluida.
- **Alerta de «Eliminar persona…»:** el texto debe decir lo que realmente se borra
  en cascada. LEÉ el código y escribí el texto con eso, sin prometer de más.

## 46 · Retirar la «Vista de perfil» y el enlace «Ver perfil completo»

**Decisión de Claudia:** la ficha de Personas ya muestra toda la información, así
que se elimina el enlace «Ver perfil completo» y la vista `?profile=<id>`.
**Va DESPUÉS de publicar los commits del 44.** Un commit por parte.

**ANTES de borrar nada, LEÉ sin cambiar nada** y listame CADA función que tiene hoy
la vista de perfil de `TeamPanel`, con archivo y línea, y dónde vive el equivalente
en el resto de la app. Sabemos de estas: quitar posiciones, «Salir del equipo»,
el enlace «🔗 Portal» (`/portal/member_<id>`), la disponibilidad por equipo y la
corona de administrador. **La ficha muestra la información, pero NO tiene esas
acciones.** Si alguna no tiene equivalente en otro lado, PARÁ y decímelo: no se
puede dejar sin camino.

**Decisiones tras la lectura de Code (octubre 2026):**
- **Quitar posiciones y «Salir del equipo»:** ya viven en Equipos › el equipo.
- **Disponibilidad por equipo** (`team_members.availability`): **SE RETIRA.** Nadie la
  usa: las 12 filas valen `unrestricted` (el valor por defecto) y ninguna regla de
  la app la lee. NO se mueve a Equipos. Quitá su edición (`updateAvailability`) y
  **también dejá de mostrarla**: el texto de Equipos (`TeamsAdminPanel.tsx:~692`) y
  la línea de la ficha que viene de `app/admin/page.tsx:~248`. **CUIDADO: en la
  ficha esa línea también muestra las fechas bloqueadas (`date_blocks`); ESAS SE
  QUEDAN. Solo se quita lo de `team_members.availability`.** NO borres la columna ni
  hagas migración. README: «`team_members.availability` quedó sin uso; la
  disponibilidad real vive en `date_blocks` (y por equipo en la fase del músico)».
- **«Ver portal ↗»:** ANTES de agregarlo, verificá si abrir `/portal/member_<id>`
  escribe `members.last_seen` o `instalado_pwa_at`. **Si lo escribe, NO agregues el
  enlace**: falsearía «En la app» (marcaría una conexión que no ocurrió). Anotalo en
  el README para la fase del músico (modo de vista para admin sin escrituras). Si no
  lo escribe, va en «EN LA APP» (solo owner/admin).
- **Corona de administrador:** SE RETIRA. **NO toques los datos de `team_admins`.**
  Mantener esa tabla sincronizada es del punto 45 (`setOrgRole`).
- **README, deuda y COMPUERTA:** `app/api/rsvp-notify/route.ts:28` lee `team_admins`
  (`team_id` null) para decidir a quién avisar cuando alguien confirma o declina un
  servicio. Hoy un administrador agregado desde Admins (que escribe
  `organization_members`) NO recibe esos avisos. **No compartir la app con el equipo
  hasta que `setOrgRole` sincronice `team_admins`.**

**Después de la lectura y mi OK:**
(a) «Ver portal» si corresponde y README. (b) Quitar el enlace «Ver perfil completo» y
retirar la disponibilidad por equipo (ya NO hay un tercer commit para moverla):
`?profile=` y su estado (`selectedProfileId`, `addingTeam`), y borrar el código que
quede sin uso en `TeamPanel`. Los enlaces de Home que usan `?person=` siguen igual.
README: quitar la nota de las dos vistas de persona.

---

# ══ LOTE 11 · Base segura y portal del músico ══ (puntos 47 a 50)

**Referencia visual de TODO el lado del músico:** `docs/mockup-musico-v2.html`
(mirala UNA vez por punto; probá «Teléfono», los tres iPhone, y el tema Oscuro).
**Es UN solo trabajo con el rediseño del portal:** para cerrar los problemas de
seguridad hay que rehacer cómo habla el portal con la base. NO se parchea el portal
viejo (`app/portal/**`): se reconstruye. **Cada punto: plan en 6 líneas antes de
implementar, un commit por parte, y pausa para que Claudia pruebe.**
**Nada de este lote está hecho. COMPUERTA: no se comparte la app con el equipo
hasta cerrar el punto 50.**

## Decisiones del lado del músico (confirmadas por Claudia, octubre 2026)

1. Dos posiciones del MISMO equipo: **una tarjeta, una aceptación.**
2. **El motivo de un bloqueo de fecha lo ven la persona, quienes administran y los
   LÍDERES de los equipos a los que aplica el bloqueo.** Nunca los líderes de otros
   equipos.
3. El músico **ve los nombres de sus compañeros** en la nómina del servicio.
4. **Disponibilidad vive dentro de Servicios**, junto a las convocatorias.
5. Orden del menú: **Inicio · Servicios · Canciones · Chats · Perfil.**
6. Apariencia: **Sistema por defecto**, con Claro y Oscuro en Perfil.
7. Miniatura del video de YouTube: **se muestra.**
Más lo ya decidido antes: menú flotante translúcido (transparencia alta, etiquetas
todas, movimiento suave), tema oscuro «Más suave», letra primero en la canción,
YouTube estándar y archivo propio excepcional con reproductor flotante, PDF en visor
dentro de la app, aceptar UN solo equipo, bloqueos por equipo, ensayos en pausa.

## Lo que hace Claudia A MANO (Code no puede)

- Crear `SUPABASE_SERVICE_ROLE_KEY` en Vercel (Production y Preview) y en
  `.env.local`, y **no pegarla en ningún chat ni dársela a Code**: él trabaja sin verla.
- Correr cada migración en el editor SQL de Supabase, **leyéndola antes**.
- Probar en un iPhone real (punto 56).
- Decidir el plan de pago de Supabase y la fecha de paso del equipo.

## 47 · Llave de servicio y cliente de servidor (S1)

- `SUPABASE_SERVICE_ROLE_KEY`: solo servidor, JAMÁS `NEXT_PUBLIC_*`. Code NO la ve,
  no la imprime y no la escribe en archivos del repo.
- `lib/supabase/admin.ts`: cliente con esa llave, con `import 'server-only'`. Solo se
  usa en `app/api/**` y server components. NUNCA desde un componente cliente:
  comprobalo con grep.
- Una ruta de salud que confirme que la llave existe SIN mostrarla.
- Regla nueva en `CLAUDE.md`: «la llave de servicio nunca sale del servidor».

## 48 · Identidad del músico: sesión de Google y enlaces de acceso (S2)

**Contexto (Claudia, octubre 2026):** hoy el 99% de los músicos entra con su cuenta de
Google (en la app antigua); solo unos pocos casos recibieron un enlace por un problema
puntual. En la plataforma NUEVA no entra nadie todavía (solo ella, probando), así que
**invalidar los enlaces viejos no cuesta nada.** Ella agrega a cada persona con su correo y
la persona entra con ese correo.
Hoy `members.id` es una credencial (`/portal/member_<id>`), los tokens de `invitations` se
pueden leer con la llave pública y `/api/portal-by-member` no pide autenticación.

- **Camino principal: la sesión.** El servidor identifica a la persona por el correo de su
  sesión (VERIFICADO) comparado con `members.email` **sin distinguir mayúsculas ni
  espacios**, con el cliente de servicio. El portal pasa a una ruta SIN id (`/portal`): la
  identidad sale de la sesión, **nunca de la URL**. Ya hay un `/auth/callback` que resuelve
  roles: LEÉLO antes de proponer nada.
- **Si el correo no coincide:** pantalla amable («No encontramos tu correo en esta
  organización. Pídele a tu líder que lo revise»), sin revelar nada más. Tené presente que el
  correo de la cuenta de Google puede diferir del que se escribió (puntos o alias de Gmail).
- **Camino excepcional: enlace de acceso**, para los pocos casos que no entran con Google. Lo
  genera un owner o admin desde la ficha («Generar enlace de acceso»); es de UNA persona, con
  **vencimiento** (por defecto 14 días), **revocable**, y **se guarda solo su hash**: la base
  nunca contiene un enlace válido. El admin lo ve UNA sola vez al generarlo. Tabla nueva
  (p. ej. `member_access_links`: `member_id`, `token_hash`, `expires_at`, `created_by`,
  `revoked_at`, `last_used_at`). **Code propone el esquema (migración) en su plan antes de
  tocar nada.** Token aleatorio de al menos 32 bytes.
- `/portal/member_<id>` deja de funcionar («enlace no válido»). Los tokens de `invitations` se
  resuelven en el punto 52.
- `Referrer-Policy` que no filtre ningún enlace con token.
- NO se agrega login por otros correos en este punto: ver el 57 (opcional).

## 49 · Portal por rutas de servidor

Todo lo que el portal hoy lee o escribe con la llave pública pasa a `app/api/portal/**`
con el cliente de servicio, validando la identidad del 48 y devolviendo SOLO los datos
de esa persona:
- Perfil (nombre, apellido, teléfono, nacimiento, foto, preferencias; NO el correo).
  `last_seen` e `instalado_pwa_at` los escribe el servidor.
- Chat: mensajes y presencia; **el realtime anónimo se reemplaza por polling**
  (cada ~5 s con la pestaña visible).
- Favoritos, convocatorias (→ 52), bloqueos de fechas (→ 51).
- **Enlaces firmados de adjuntos y audio: se firman AL PULSAR**, tras validar la
  identidad (el de la lista caduca a la hora y un músico sin sesión de Google hoy no
  puede firmar).
- `app/confirm/[token]` pasa por el servidor.
- «Ver portal» para admin: un modo de vista que NO escribe `last_seen` (ver la nota
  del 46). Se quita `localStorage['ancora-dark-mode']` del portal.

## 50 · Cerrar las políticas RLS abiertas (S3)

**Una tabla por vez**, cada una con su migración, su prueba del portal y de `/admin`
antes de pasar a la siguiente. Orden: `invitations` (sin SELECT anónimo), `members`,
`messages` y `chat_presence`, `date_blocks` y `availability`, `push_subscriptions`;
borrar `admin_emails` (legado); el resto con el patrón `is_org_admin` /
`is_any_team_leader` de la 023. Storage: quitar la subida anónima de portadas.
- **`rsvp-notify`** pasa a leer `organization_members` con la llave de servicio y se
  RETIRA la sincronización de `team_admins` (cierra la deuda del 45).
- Al final, reemitir los enlaces del portal.
- **Prueba de cierre:** con la llave pública, un `select` a cada una de esas tablas
  devuelve 0 filas o 401, y el portal y `/admin` siguen funcionando.
- Pendiente de Claudia: confirmar si los datos de «Ancora - Teams» son reales o
  anonimizados (consulta de `@test.local`), y la prueba sin sesión de la 027.

---

# ══ LOTE 12 · Datos por equipo ══ (puntos 51 y 52)

## 51 · Bloqueos de fecha por equipo

Referencias: `docs/mockup-disponibilidad-equipos.html` y la pantalla Disponibilidad de
`docs/mockup-musico-v2.html`.
- `date_blocks.team_id` (nullable; **NULL = todos los equipos**, que es el significado
  de hoy: sin backfill). Índice único `(member_id, blocked_date, coalesce(team_id,
  uuid_nil))`. NO borres el índice viejo hasta que la API nueva esté desplegada.
- **Valor por defecto al bloquear: todos los equipos de la persona**, y ella libera los
  que quiera. En el calendario: cuadro lleno = todos; esquina marcada = algunos.
- **Privacidad:** un líder ve a una persona como no disponible SOLO si el bloqueo aplica
  a SU equipo; nunca puede deducir en qué otros equipos bloqueó. **El motivo lo ven la
  persona, quienes administran y los líderes de los equipos a los que aplica.**
- Reescribí `blocked_others_summary` y el panel de bloqueos del Home con esa regla, sin
  exponer filas de otros equipos (funciones `security definer` o rutas de servidor).
- El aviso al asignar (punto 32) ya usa `blocked_date`: ahora respeta el equipo.

## 52 · Convocatorias por equipo

- Hoy `invitations` es UNA fila por (servicio, persona), sin equipo. Pasa a una por
  (servicio, persona, equipo): `team_id`. **El conflicto es ESTRICTO:** solo se permiten
  varias posiciones dentro de UN mismo equipo; NO hay interruptor «combinable». Varias
  posiciones del mismo equipo = una tarjeta, una aceptación.
- Al confirmar en un equipo, las demás convocatorias PENDIENTES de la misma persona que
  se solapen en horario pasan a `declinado` con `declined_reason='conflict'` y
  `superseded_by`. **Reversible**, aplicado EN LA BASE con bloqueo contra carreras
  (`pg_advisory_xact_lock` por persona). Nunca toca las ya confirmadas. Solape por
  `hora_inicio` / `hora_fin` (nulos: 10:00 y 14:00; solape estricto; fin ≤ inicio no
  choca con nada).
- **Una declinación por conflicto NO es «No pudo»:** el historial (PersonDrawer, Home,
  StatsPanel, AdminServiceView, EnsayoPanel) dice «Aceptó en otro equipo» y no cuenta
  como rechazo. En la nómina del líder: círculo tachado con «Aceptó en {equipo}».
- «Aceptar aquí en su lugar»: saca al equipo anterior (queda vacante y aparece en
  «Necesita atención» de ese líder) y confirma en el nuevo. «Quitar mi confirmación»
  devuelve las declinadas por conflicto a pendiente.
- **No avisar** «no podrá asistir» al líder por una declinación por conflicto
  (`trg_notify_rsvp_change` y `rsvp-notify`). LEÉ `trg_snapshot_confirmed_posiciones` y
  `trg_flag_reassignment_if_changed` antes de escribir un trigger nuevo: tienen que convivir.
- **Datos viejos:** 55 de las 78 asignaciones usan códigos de posición viejos (punto 35)
  que no se pueden atribuir a un equipo. El mapeo código → posición va ANTES. Las
  invitaciones existentes quedan con `team_id` NULL como histórico de solo lectura.
- Los ensayos siguen en pausa.

---

# ══ LOTE 13 · La app del músico ══ (puntos 53 a 56)

## 53 · Envoltura: tokens, menú, zona segura y tema

- El portal adopta los tokens v5 (los mismos del administrador): se retiran los colores en
  línea y el sistema de dos estados. Tema Sistema / Claro / Oscuro con el control
  «Apariencia» en Perfil, con el mismo `useDarkMode` y la cookie `anc-theme`.
- **Menú flotante translúcido.** Teléfono: píldora inferior. Escritorio: píldora superior,
  con la marca a la izquierda y el perfil a la derecha como piezas sueltas. Transparencia
  «alta»: **70% en claro y 78% en oscuro** (mínimo calculado para que la etiqueta se lea
  en el peor caso). Etiquetas SIEMPRE visibles, y las inactivas con el gris MÁS oscuro de
  la escala (`#404040` en claro, `#D4D4D4` en oscuro), no `--anc-ink-3`. Íconos de 16px en
  un círculo de 36px.
- **El indicador circular SE MUEVE** entre ítems: es UN solo elemento que persiste. **El
  menú se construye UNA vez; no se redibuja al navegar** (si no, la animación es
  imposible). Movimiento «suave»: 300 ms, `cubic-bezier(.2,.8,.2,1)`; el ícono nuevo se
  pone claro recién cuando el círculo llega. Con `prefers-reduced-motion`, salta sin
  animar. Sin `backdrop-filter` o con `prefers-reduced-transparency`, fondo sólido.
  El desenfoque va en UN solo elemento (14 a 20px); si va a tirones en un teléfono, se
  pasa a «sólido» sin tocar nada más.
- En el administrador, el mismo menú con «Personas» separada por una línea fina.
- **Zona segura del iPhone:** `viewport-fit=cover`; `env(safe-area-inset-top / bottom /
  left / right)` en los cuatro lados; el menú, las hojas inferiores y la barra de inicio
  respetan la inferior; degradado bajo la barra de estado. **NUNCA píxeles fijos.** En la
  app INSTALADA el estilo de la barra de estado (`apple-mobile-web-app-status-bar-style`)
  cambia entre versiones de iOS: probar las opciones en un iPhone real antes de decidir.
- Escala de z-index: menú 20 · visor de PDF 28 · reproductor flotante 29 · velo 30 ·
  hoja 31 · avisos 40 · alertas 45.
- Contraste: el texto tenue en oscuro (`#9E9E9E`) sobre la fila resaltada da 4,5:1 justo:
  vigilarlo.

## 54 · Las pantallas del músico

- **Inicio:** tarjeta destacada del próximo servicio (`--anc-hero`), «Mis equipos y
  posiciones» (monograma y posiciones, SIN instrumentos), próximos servicios con su estado,
  cumpleaños.
- **Servicios:** pestañas Convocatorias | Disponibilidad. Convocatorias: una tarjeta por
  equipo con su franja de color; Aceptar / No puedo; las otras quedan «Declinada ·
  aceptaste en X»; «Aceptar aquí en su lugar» con hoja de confirmación.
- **Servicio:** Orden (lectura; «Lead: tú» cuando toca) | Equipo (nómina por equipo; **el
  músico ve los nombres de sus compañeros**) | Mi cronograma (el de su equipo, calculado
  con la hora de inicio del servicio).
- **Canciones:** buscador y Todas / Favoritas / Del domingo. **Chats.** **Perfil:** datos,
  equipos y posiciones, Apariencia, tipografía de la letra, notificaciones, «Administración»
  solo si tiene rol, y cerrar sesión.
- **El músico NO ve porcentajes ni conteos de sus compañeros.**
- Depende de los puntos 51 y 52 para Disponibilidad y Convocatorias por equipo.

## 55 · La canción: letra, PDF y audio

- **Orden:** primero la letra; debajo, Adjuntos y después Audio. Solo letra (los acordes
  viven en adjuntos). «Aa»: fuente y tamaño, guardados en el perfil.
- **Visor de PDF dentro de la app** (hoja a pantalla completa; en escritorio, ventana
  centrada): PDF.js cargado SOLO al abrir; zoom con botones − / + / Ajustar, doble toque,
  pellizco y arrastre; Ctrl+rueda y teclas + − 0 en escritorio; ◐ invierte los colores; ↗
  «Abrir en el visor del teléfono» como salida. El enlace se firma AL PULSAR «Ver».
  **Antes:** comprobar que el almacenamiento permite leer el archivo desde el navegador
  (CORS). **Riesgos a probar en iPhone:** fluidez del pellizco (programado a mano),
  nitidez a zoom alto (el lienzo tiene un límite), y memoria con PDFs de muchas páginas
  (dibujar solo las visibles). Si el pellizco no se siente bien, ese zoom se deja al visor
  nativo.
- **Audio.** YouTube es el estándar; subir un archivo es excepcional. **Solo enlaces de
  YouTube:** extraer el identificador de 11 caracteres y armar la URL de
  `youtube-nocookie.com` en la app; **NUNCA incrustar lo pegado tal cual.** El reproductor
  se carga al pulsar play, suena uno solo a la vez, trae «Abrir en YouTube» de respaldo y
  se detiene al salir de la canción (con aviso). Al agregar el enlace, consultar oEmbed en
  el servidor para guardar el título y avisar si no se puede incrustar. La miniatura se
  muestra (decidido). Revisar `Referrer-Policy` (YouTube exige la referencia del sitio) y
  la CSP (`frame-src`, `script-src`).
- **Archivo propio** (solo administración): mp3 o m4a, máximo 20 MB **impuesto en el
  bucket** (límite y tipos permitidos), no solo en la pantalla. `<audio preload="none">`,
  enlace firmado al pulsar, `Media Session`. **Reproductor flotante** sobre el menú en
  cualquier pantalla, incluida la letra: contraído (título, play, tiempo) o expandido
  (barra, ±10 s, velocidad 1× / 1,25× / 0,75×); se cierra con ✕; baja con el menú cuando
  este se esconde al desplazar la letra. Al pulsar un video de YouTube, el archivo propio
  se detiene. **NO existe mini-reproductor para YouTube** (hasta donde conozco las
  condiciones de YouTube, el video tiene que verse y no se puede reproducir solo el
  audio: confirmarlo en las condiciones vigentes).
- **Spotify y Apple Music** dejan de ofrecerse: salen del formulario SIN borrar datos.

## 56 · Pruebas en un iPhone real (no se pueden verificar desde el escritorio)

Pellizco y doble toque del visor; nitidez a 400%; audio propio con la pantalla bloqueada y
controles en el bloqueo; el reproductor flotante contra la barra de inicio; zona segura en
un modelo con Dynamic Island, con muesca y sin ella; app instalada: estilo de la barra de
estado en claro y oscuro; rendimiento del menú con desenfoque; que el menú no tape el
último contenido; cambio de tema sin parpadeo; y los enlaces firmados tras más de una hora
con la pantalla abierta.

## 57 · (Opcional) Entrar con cualquier correo, no solo con Google

Claudia lo quiere si no es engorroso. Se puede: Supabase Auth permite entrar con un **código de
un solo uso enviado al correo** (o un enlace mágico), para cualquier correo (iCloud, Outlook,
etc.). Lo único engorroso es el ENVÍO de correos: el remitente que trae Supabase tiene límites
muy bajos y no sirve para un equipo; hace falta un servicio de correo propio (SMTP). La
identidad se resuelve igual que con Google: correo de la sesión = `members.email`. **No bloquea
ni cambia el 48:** se agrega después del 56, con su plan.

## Orden de ejecución recomendado

47 → 48 → 49 → 53 → 55 → 51 → 52 → 54 → 50 → 56. La envoltura (53) y la canción (55) no
dependen de los datos por equipo; las pantallas (54) sí, por eso van después de 51 y 52; las
políticas (50) se cierran cuando ya nada anónimo depende de ellas.

## COMPUERTAS antes de compartir la app con el equipo

1. Punto 50 cerrado (seguridad). 2. `rsvp-notify` migrado y `team_admins` sin sincronizar.
3. Saber si los datos son reales o de prueba, y cargar las 19 canciones sin letra ni
adjuntos. 4. Mapear los códigos de posición viejos (punto 35). 5. Punto 56 en un iPhone
real. 6. Decidir el plan de pago de Supabase (pausas y copias de seguridad). 7. La fecha en
que el equipo pasa a la plataforma.

## Pruebas DIFERIDAS hasta desplegar a `main` (decisión de Claudia, octubre 2026)

**Contexto confirmado en Vercel:** la rama de producción es `main` (`ancorateams.vercel.app`,
último despliegue a producción: 25 de agosto, commit `d4a47e5` «fundación de seguridad»).
`dev` se despliega como **Preview**, en una dirección de rama protegida con el inicio de
sesión de Vercel: por eso un enlace abierto en incógnito ahí pide una cuenta de Vercel (no es
un error del enlace). La base de datos es UNA sola para ambos. Se acordó seguir adelante y
revisar los enlaces de acceso cuando se despliegue a `main`. **Nada de esto está probado en
`https` todavía.**

1. **Enlace de acceso con el dominio real:** abrirlo en incógnito desde
   `https://ancorateams.vercel.app`: redirige a `/portal` SIN el token en la barra; la cookie
   `ancora-portal` lleva HttpOnly y Secure; probar en Chrome Y en Safari.
2. **Dominio del enlace:** el endpoint de admin debe armar el enlace con el origen REAL de la
   petición (`x-forwarded-host` y `x-forwarded-proto` detrás de Vercel), con
   `NEXT_PUBLIC_APP_URL` solo como respaldo. **NUNCA** `VERCEL_URL` ni `VERCEL_BRANCH_URL`.
   `NEXT_PUBLIC_APP_URL` debe valer `https://ancorateams.vercel.app` en Production. Los
   correos de invitación usan esa misma base: hoy un enlace generado desde Preview apuntaría a
   una dirección protegida. Pequeño, hacerlo antes del punto 50.
3. **El enlace NO abre la administración:** con la sesión de un enlace de acceso, `/admin` y
   `/home` no deben dejar entrar. (Estructuralmente verificado con grep; falta la prueba manual.)
4. **Revocar y vencer** cortan la sesión en la petición siguiente (ya probado con base falsa).
5. **Google en el dominio público:** `https://ancorateams.vercel.app` debe estar entre las URL
   permitidas de Supabase Auth (Site URL y Redirect URLs).
6. **Antes de unir `dev` con `main`:** `git log dev..main` y `git log main..dev`; ¿`dev` contiene
   `d4a47e5`?; simular el merge y listar conflictos. Averiguar QUÉ versión corre hoy en `main`.
7. **Políticas (punto 50):** cerrarlas rompe cualquier versión que use la llave pública. La
   versión actual de `main` podría ser una. Decidir qué hacer con ella ANTES del punto 50.
8. Migraciones 029 (y 030, si se corre) están en la base compartida: la versión vieja de `main`
   las ignora.

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
