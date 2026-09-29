/* ════════════════════════════════════════════════════════════════════════
   parseLyrics.ts — solo letra. Función pura, sin dependencias.

   NO es parseChart.ts ni lo reemplaza — ese sigue intacto para cuando se
   retomen los acordes (fase 20, docs/PENDIENTES-code.md). Este parser es
   deliberadamente mucho más simple: no hay acordes, no hay columnas que
   alinear, no hay fuente proporcional que desalinee nada.

   FORMATO — un solo textarea:
     NOMBRE DE LA SECCIÓN:
     su letra
     línea por línea

     SIGUIENTE SECCIÓN:
     ...

   Una línea vacía separa una sección de la siguiente. Eso es todo el
   formato — sin corchetes, sin marcas. Es justamente lo que hace que la
   letra pegada desde Word sobreviva: no depende de espacios ni columnas,
   que era el problema real de los acordes.

   Tolerancia deliberada (la gente no va a escribir el formato perfecto
   siempre):
   - El ":" final es opcional — "CORO" vale igual que "CORO:".
   - Paréntesis al final valen — "VERSO 1 (2x):".
   - Si el primer bloque no tiene encabezado reconocible, se muestra igual
     como una sección sin nombre — nunca se descarta texto.

   Heurística de "¿es encabezado?": una línea corta (≤40 caracteres), de
   hasta 4 palabras, cada una empezando en mayúscula o dígito, sin coma ni
   punto — eso separa una etiqueta ("VERSO 1", "Coro") de un verso cantado
   real (que en español solo lleva mayúscula en la primera palabra). No es
   perfecto: una frase corta con cada palabra en mayúscula podría
   confundirse con un encabezado — por eso el editor siempre muestra la
   vista previa en vivo al lado, para que se note y se corrija al toque. */

export type LyricSection = { name: string; lyrics: string }

const HEADER_RE =
  /^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9]*(?:\s+[A-ZÁÉÍÓÚÑ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9]*){0,3})\s*(\([^)]*\))?\s*:?\s*$/

function looksLikeHeader(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 40) return false
  return HEADER_RE.test(t)
}

export function parseLyrics(raw: string): LyricSection[] {
  const blocks = raw.replace(/\r/g, '').split(/\n[ \t]*\n+/)
  const sections: LyricSection[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    while (lines.length && !lines[0].trim()) lines.shift()
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
    if (!lines.length) continue

    const first = lines[0].trim()
    if (lines.length > 1 && looksLikeHeader(first)) {
      sections.push({ name: first.replace(/:\s*$/, ''), lyrics: lines.slice(1).join('\n') })
    } else {
      // sin encabezado reconocible: se muestra igual, sin nombre, en vez
      // de perder la letra o adivinar mal.
      sections.push({ name: '', lyrics: lines.join('\n') })
    }
  }
  return sections
}
