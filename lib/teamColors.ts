/* ════════════════════════════════════════════════════════════════════════
   teamColors.ts — colores de equipo. Funciones puras, sin dependencias.

   NO se reescribe. Los valores salen de un cálculo (distancia de color en Lab
   bajo visión normal, daltonismo rojo-verde y protanopía), no de una opinión.
   Si hay que cambiar un color, se cambia en ancora-tokens-v5.css Y se vuelve
   a calcular DISTANCE_NORMAL / DISTANCE_WORST; avisame antes.

   EL CÓDIGO HEX NO VIVE ACÁ. Vive solo en el CSS: el elemento lleva
   data-team="{key}" y hereda --anc-team-a / -m / -t. Así hay una sola fuente.
   ════════════════════════════════════════════════════════════════════════ */

export type TeamColorKey = "cobalto" | "rosa" | "violeta" | "turquesa" | "cielo" | "naranja" | "fucsia";

/** En ESTE orden se asignan a los equipos nuevos. Los tres primeros quedan a
 *  distancia ≥ 29 incluso con daltonismo. Naranja y Fucsia van al final: en tema
 *  oscuro y con daltonismo se acercan al ámbar y al rojo de los estados. */
export const TEAM_COLOR_ORDER: TeamColorKey[] = ["cobalto", "rosa", "violeta", "turquesa", "cielo", "naranja", "fucsia"];

export const TEAM_COLOR_NAME: Record<TeamColorKey, string> = {
  cobalto: "Cobalto",
  rosa: "Rosa",
  violeta: "Violeta",
  turquesa: "Turquesa",
  cielo: "Cielo",
  naranja: "Naranja",
  fucsia: "Fucsia",
};

/** Distancia de color (ΔE76) con visión NORMAL. Menos de 25 = se parecen. */
export const DISTANCE_NORMAL: Record<TeamColorKey, Record<TeamColorKey, number>> = {
  cobalto: { cobalto: 0, rosa: 77, violeta: 30, turquesa: 88, cielo: 54, naranja: 130, fucsia: 54 },
  rosa: { cobalto: 77, rosa: 0, violeta: 67, turquesa: 104, cielo: 90, naranja: 69, fucsia: 39 },
  violeta: { cobalto: 30, rosa: 67, violeta: 0, turquesa: 111, cielo: 80, naranja: 131, fucsia: 32 },
  turquesa: { cobalto: 88, rosa: 104, violeta: 111, turquesa: 0, cielo: 36, naranja: 102, fucsia: 115 },
  cielo: { cobalto: 54, rosa: 90, violeta: 80, turquesa: 36, cielo: 0, naranja: 113, fucsia: 90 },
  naranja: { cobalto: 130, rosa: 69, violeta: 131, turquesa: 102, cielo: 113, naranja: 0, fucsia: 108 },
  fucsia: { cobalto: 54, rosa: 39, violeta: 32, turquesa: 115, cielo: 90, naranja: 108, fucsia: 0 },
};

/** Peor distancia de las TRES visiones. Menos de 12 = se parecen para quien
 *  tiene daltonismo. */
export const DISTANCE_WORST: Record<TeamColorKey, Record<TeamColorKey, number>> = {
  cobalto: { cobalto: 0, rosa: 77, violeta: 29, turquesa: 17, cielo: 6, naranja: 130, fucsia: 54 },
  rosa: { cobalto: 77, rosa: 0, violeta: 67, turquesa: 70, cielo: 90, naranja: 35, fucsia: 32 },
  violeta: { cobalto: 29, rosa: 67, violeta: 0, turquesa: 9, cielo: 24, naranja: 111, fucsia: 32 },
  turquesa: { cobalto: 17, rosa: 70, violeta: 9, turquesa: 0, cielo: 23, naranja: 102, fucsia: 37 },
  cielo: { cobalto: 6, rosa: 90, violeta: 24, turquesa: 23, cielo: 0, naranja: 113, fucsia: 60 },
  naranja: { cobalto: 130, rosa: 35, violeta: 111, turquesa: 102, cielo: 113, naranja: 0, fucsia: 67 },
  fucsia: { cobalto: 54, rosa: 32, violeta: 32, turquesa: 37, cielo: 60, naranja: 67, fucsia: 0 },
};

export function isTeamColor(v: unknown): v is TeamColorKey {
  return typeof v === 'string' && (TEAM_COLOR_ORDER as string[]).includes(v);
}

/** Primer color del orden que nadie usa. Si ya se usan todos, el menos usado
 *  (empata por orden). Ignora valores nulos o desconocidos. */
export function nextFreeColor(used: ReadonlyArray<string | null | undefined>): TeamColorKey {
  const count = new Map<TeamColorKey, number>(TEAM_COLOR_ORDER.map((k) => [k, 0]));
  for (const u of used) if (isTeamColor(u)) count.set(u, (count.get(u) ?? 0) + 1);
  let best = TEAM_COLOR_ORDER[0];
  for (const k of TEAM_COLOR_ORDER) if ((count.get(k) ?? 0) < (count.get(best) ?? 0)) best = k;
  return best;
}

export type ColorWarning = { other: TeamColorKey; kind: 'same' | 'similar' | 'cvd' };

/** Avisos al elegir `chosen` teniendo ya `others` en uso. Se AVISA, nunca se
 *  impide: con más de 7 equipos los colores se repiten sí o sí. */
export function colorWarnings(chosen: TeamColorKey, others: ReadonlyArray<TeamColorKey>): ColorWarning[] {
  const out: ColorWarning[] = [];
  for (const o of others) {
    if (o === chosen) out.push({ other: o, kind: 'same' });
    else if (DISTANCE_NORMAL[chosen][o] < 25) out.push({ other: o, kind: 'similar' });
    else if (DISTANCE_WORST[chosen][o] < 12) out.push({ other: o, kind: 'cvd' });
  }
  return out;
}

/* ════════════════════════════════════════════════════════════════════════
   CASOS VERIFICADOS — si tocás algo, estos tienen que seguir dando igual.

   nextFreeColor([])                         → "cobalto"
   nextFreeColor(["cobalto"])                → "rosa"
   nextFreeColor(["cobalto","rosa","violeta"]) → "turquesa"
   nextFreeColor([null, "xyz", "cobalto"])   → "rosa"     (ignora lo desconocido)
   nextFreeColor(todos los 7)                → "cobalto"  (reinicia el ciclo)
   nextFreeColor(todos + "cobalto")          → "rosa"     (el menos usado)
   colorWarnings("cobalto", ["cobalto"])     → [{other:"cobalto", kind:"same"}]
   colorWarnings("cielo", ["cobalto"])       → [{other:"cobalto", kind:"cvd"}]
   colorWarnings("rosa", ["turquesa"])       → []
   ════════════════════════════════════════════════════════════════════════ */
