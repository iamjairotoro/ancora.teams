// Busca, en los .txt que deja cap.js con TEXTO=1, las pantallas que NO cargaron lo real: error, vacío, cargando o herramienta sin cargar. Uso: node revisar-estados.js <carpeta con los .txt>
// Lista cada captura con la frase que la delata; el resto cuenta como «cargó». Los estados vacíos que el escenario busca a propósito (p. ej. un chat sin mensajes) se revisan a mano en la lista.
const fs = require('fs'), path = require('path')
const dir = process.argv[2]
const MALOS = [[/No encontramos/i, 'no encontró lo pedido'], [/No se pudo/i, 'error de carga'], [/No pudimos/i, 'error de carga'], [/Cargando|Un momento/i, 'sigue cargando'], [/Algo salió mal|Reintentar/i, 'error con reintento'], [/No hay [a-záéíóúñ ]+ pr[oó]ximos?/i, 'vacío'], [/Aún no hay|Todavía no hay|Sin resultados|No hay nada/i, 'vacío'], [/Confirma tu asistencia/i, 'bloqueado hasta confirmar']]
const filas = []
for (const n of fs.readdirSync(dir).filter(x => x.endsWith('.txt')).sort()) { const t = fs.readFileSync(path.join(dir, n), 'utf8'), hit = MALOS.filter(([re]) => re.test(t)).map(([re, m]) => `${m} («${(t.match(re) || [''])[0]}»)`); if (hit.length) filas.push(`${n.replace('.txt', '')}  →  ${hit.join('; ')}`) }
console.log(filas.length ? filas.join('\n') : '(ninguna)'); console.log(`${fs.readdirSync(dir).filter(x => x.endsWith('.txt')).length} textos revisados; ${filas.length} sospechosos`)
