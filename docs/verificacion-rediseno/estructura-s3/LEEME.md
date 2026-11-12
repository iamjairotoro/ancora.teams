# Estructura de «Nueva canción» · S3: la tira es la estructura

Rama `estructura-ui`. Tablero «Nueva canción · 6». Solo el editor de una canción NUEVA en teléfono; el editor de canciones ya guardadas y el escritorio no cambian.

## Qué cambia
- La tira de círculos del editor ya no es «una parte = un círculo»: es la **estructura**, un círculo por **aparición**, en orden. Por defecto (cada parte una vez, en el orden del texto) se ve igual que antes. Una parte puede salir varias veces; desde la segunda aparición el círculo lleva **borde punteado**.
- Cabecera sobre la tira: «ESTRUCTURA · N PARTES» y, solo si hay repetidas, «Borde punteado = se repite». Su alto está reservado (también en el marcador de carga), así la tira no se mueve.
- Cada círculo se llama «CORO, lugar 4 de 5». Tocar un círculo lo activa y lleva a SU parte; un segundo toque (o un toque largo) abre el menú de ESE lugar.
- Una parte activa que se repite: si el último círculo tocado ya es de esa parte se queda ese; si no, el primero de esa parte.
- En el modo Acordes, bajo el nombre de una parte que sale más de una vez: «Esta letra se usa 3 veces en la estructura. Se escribe una sola vez.»
- Guardar manda `estructura: [{indice, repeat}]` (S2) solo si no es la de por defecto, solo en canción nueva y sin arreglo propio. Ya no manda `arreglo` (el servidor lo sigue aceptando).
- Con arreglo propio guardado la tira muestra la estructura guardada (`estructuraGuardada`, S2) y es de solo lectura (el menú sale apagado con el aviso del tablero 5b).
- El menú del círculo todavía tiene «Repetir ×N» (hasta S5): ahora deja esa parte con N círculos seguidos. `fijarSeguidas` y `seguidasEn` son interinos y se quitan en S5.

## Pruebas
- `tests/portal/estructura-s3-tira.test.js` (11) y `tests/mutaciones/estructura-s3-tira.json` (23 mutaciones, todas detectadas).
- Adaptadas a propósito (el código cambió): `nueva-cancion-paso-c`, `nueva-cancion-paso-d`, `admin-movil-esqueletos`. Mutaciones de paso C y D actualizadas; el paso D tenía 2 mutaciones del servidor desactualizadas desde S2 (#11, #12), ya arregladas.
- Navegador real (CDP) a 390 y 360 px, claro y oscuro: `tests/e2e-menus/estructura-s3-tira.js` (30 comprobaciones por combinación). Capturas en esta carpeta.
- Regresión: `tests/e2e-menus/correr-regresion-nueva-cancion.sh` (pasos A, B, C, D, adjuntos, lectura C3a, tira fija y esqueletos de carga).
