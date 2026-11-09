# Endurecimiento del editor de acordes (rama `endurecimiento-editor-acordes`)

Prueba en navegador real: `tests/e2e-menus/endurecimiento-editor.js` (servidor simulado en la página, datos inventados; el caso es el del daño del 8 nov 2026: letra de relleno, 4 secciones en formato antiguo con acordes ilegibles, arreglo de 8 entradas).

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 node tests/e2e-menus/endurecimiento-editor.js docs/verificacion-rediseno/endurecimiento/capturas
```

Capturas (390 y 360 px, claro y oscuro), en `capturas/`:

| Archivo | Qué muestra |
|---|---|
| `ficha-aviso` | el aviso en la ficha: arreglo de 8 entradas + formato antiguo |
| `editor-oferta` | el editor ofrece «Cargar desde las secciones guardadas» |
| `resumen` | el resumen antes del primer Guardar (letra, secciones, arreglo) |
| `resumen-arreglo` | borrar «PUENTE»: el resumen lista la sección del arreglo afectada y pide «Entiendo, guardar igual» |
| `arreglo-409` | el servidor se adelanta (409 de arreglo): el mismo diálogo |
| `sin-respaldo` | respaldo imposible (falta la migración 055): aviso claro, el editor conserva los cambios |
