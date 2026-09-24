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
