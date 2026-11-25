> **EN PAUSA desde 2026-11-25: no ejecutar.**

# Orden de ejecución · chats por sala (una página)

**Dónde:** Supabase → proyecto «Ancora - Teams» (la única base: dev y main la comparten, toda escritura es real) → **SQL Editor** → *New query* → pega **todo** el archivo → **Run**. Después **copia la tabla de resultados** (botón *Copy* → CSV o Markdown) y pégasela a Claude. Nunca copies llaves ni contraseñas.
**Regla de oro:** si un paso sale mal, **no sigas con el siguiente**; pega lo que salió. Todo esto es solo SQL de revisión: el código de los chats no se toca hasta que tú lo apruebes.

**Antes de empezar (una vez, en un horario tranquilo):** en la Terminal, en la carpeta del proyecto: `node scripts/backup.js`. ✅ dice «llave de servicio: sí» y «Total: N fila(s) respaldadas en backup/…», sin ⚠️. ❌ dice «NO» o muestra ⚠️ → no empieces. Además, en Supabase → *Database → Backups* anota la fecha de la última copia (si el plan no tiene, esta es la única).

## Fase 1 · ahora (todo seguro: lee, o solo agrega cosas nuevas)
| # | Pega este archivo (carpeta `docs/plan-chats-por-sala/`) | Qué copiar | ✅ Salió bien | ❌ Salió mal |
|---|---|---|---|---|
| 1 | `057-0-diagnostico-chats.sql` (solo lectura) | La tabla entera. **Guárdala en un archivo:** es el respaldo de las políticas actuales. | Corre sin error; **no** hay filas «7 YA EXISTE»; ninguna fila «8 requisitos» dice FALTA. | Error rojo, filas «7 YA EXISTE» o algún FALTA → no sigas. |
| 2 | `057a-chats-por-sala-parte-a.sql` (solo agrega) | La tabla final «paso / comprobación / resultado». | 7 filas, **todas OK**. | Algún FALLA o error rojo (si hay error no queda nada a medias) → no sigas. |
| 3 | `057-v1-regla-y-permisos.sql` (solo lectura) | La tabla. | Columna *veredicto*: **OK** en todas (las filas 12 a 15 dicen INFO: son solo informativas; copia su valor). | Algún FALLA: la columna *resultado* dice cuántos casos (en las filas 10 y 11, cuántas filas tienen un valor distinto del esperado). |
| 4 | `057-v3-team-messages.sql` (toca solo la tabla nueva y lo deshace) | La tabla. | 6 filas **OK**. | Algún FALLA. (SIN DATOS = no se pudo probar, no es falla.) |
| 5 | *Opcional:* `057-v2-salir-y-declinar.sql` (toca filas reales y lo deshace: **solo con el respaldo hecho**) | La tabla. | OK o SIN DATOS. | Algún FALLA. |
| 6 | Terminal: `node docs/plan-chats-por-sala/057-realtime-anon.mjs` | La línea que imprime. | **Hoy debe decir «FALLA: la llave pública recibió…»**: confirma el problema (no es culpa tuya). | Dice «OK: no recibió nada» (avísame: quizá ya está cerrado) o un error de conexión. |

➡️ **Avisa a Claude con los resultados.** Recién entonces empieza el cambio de código (en `dev`; necesita que el paso 2 esté hecho).

## Fase 2 · cerrar `messages` (cuando Claude lo pida)
**Antes:** en producción (main) abre *Chats*, envía un mensaje y comprueba que llega (confirma que el chat usa la llave de servicio), y abre *Admin → Chats* (carga).
| # | Archivo | Qué copiar | ✅ Bien | ❌ Mal |
|---|---|---|---|---|
| 7 | `057b-cerrar-messages.sql` (el editor avisa de un `DROP POLICY`: acepta) | La tabla final. | 5 filas **OK**. | FALLA o error → pega todo; se deshace recreando las políticas guardadas en el paso 1. |
| 8 | `057-v4-messages-cerrada.sql` (revierte lo que escribe) | La tabla. | **OK** en todas (SIN DATOS no es falla). | Algún FALLA. |
| 9 | Terminal: el mismo `057-realtime-anon.mjs` | La línea. | **«OK: la llave pública no recibió nada»**. | Dice FALLA. |
| 10 | A mano, en producción: *Chats* (enviar un mensaje) y *Admin → Chats* | — | Ambos funcionan; *Admin → Chats* muestra solo el General. | Algo no carga → **avisa de inmediato** (se deshace con el paso 1). |

## Fase 3 · cuando el código nuevo ya esté en `main` (no antes)
| 11 | `057c-validar-messages-y-quitar-tiempo-real.sql` | La tabla final. | 2 filas **OK**; después envía un mensaje al General y uno de servicio: se guardan. | FALLA, o un mensaje legítimo es rechazado → avisa. |

## Fase 4 · borrado a los 90 días (cuando tú lo decidas)
| 12 | `057d-purga-chats-de-servicio.sql` (solo crea la función; no borra nada) | La tabla final. | 3 filas **OK**. | FALLA. |
| 13 | **Borrar de verdad** (único paso destructivo): respaldo del mismo día → la consulta de conteo en seco que trae el final de `057d` → anota el número → **solo con tu OK explícito**: `select public.chat_purgar_servicios(90);` | El número que devuelve. | Coincide con el conteo en seco. | No coincide → no repitas; avisa. |

**Qué NO correr nunca:** nada de `test-schema/` (en especial `enable-notification-triggers.sql`: apunta a la app vieja con usuarios reales).
