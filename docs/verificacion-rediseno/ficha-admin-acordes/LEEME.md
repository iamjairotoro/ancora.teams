# Ficha de administradora con acordes (Modo Admin)

Rama `ficha-admin-acordes`. En la ficha de una canción (Modo Admin, solo owner y admin), cuando la canción tiene tono y todas las variantes usadas están en formato 2, se dibuja la hoja con acordes (HojaAcordes y LineaConAcordes, el mismo dibujo de la lectura) en lugar de la hoja de letra. Si no se cumple, la ficha es la de siempre.

- **Teléfono y escritorio** (solo la ficha de administradora; la regla del portal de músicos no cambia: `CancionPortal` y `HojaAcordes` quedan igual que en main).
- **Una sola lectura**: la ruta del editor (`GET /api/admin/canciones/acordes`) entrega además `hojaFicha`; el aviso del arreglo comparte esa misma lectura.
- **Botones y escrituras**: Tipografía, Editar, Editar con acordes (solo teléfono) y Adjuntos quedan idénticos. Lo único que se escribe es la notación ABC/123 de la persona (como en la lectura).
- **Líderes que no son administradores**: la ruta responde 403 y la ficha sigue mostrando la letra.
- **Avisos** (solo en esta ficha): «otras versiones» (una sección tiene más de una versión viva; se muestra la principal; hoy no hay casos en los datos) y «la letra de la ficha y la de los acordes guardados no coinciden» (compara las palabras: no cuentan espacios, mayúsculas, tildes, signos, saltos de línea, encabezados de sección ni «(instrumental)»).
- **Formato antiguo o sin tono**: nada cambia ni se convierte.

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/ficha-admin-acordes.js`, 14 comprobaciones por combinación (390 y 1280 px, claro y oscuro). La ficha SIN acordes se compara con una copia tomada de main (`tests/e2e-menus/golden/`).

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-ficha.sh tests/e2e-menus/ficha-admin-acordes.js docs/verificacion-rediseno/ficha-admin-acordes/capturas
# copia de main (si algún día cambia la ficha de hoy a propósito): construir main y correr con BASELINE=1
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra |
|---|---|
| `sin-hoja` | la ficha de siempre (la ruta no entrega hoja) |
| `con-hoja` | la ficha con la hoja con acordes |
| `con-hoja-numeros` | con «123» |
| `avisos` | los dos avisos sobre la hoja |
