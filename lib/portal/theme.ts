// Colores del portal del músico (punto 53): SOLO tokens v5 (`--anc-*`, app/ancora-tokens-v5.css). No hay hex ni
// sistema de dos estados: el tema (Sistema/Claro/Oscuro) lo decide `<html data-theme>` y los tokens cambian solos.
// Cada nombre de acá apunta al token equivalente del color que había en línea; las pantallas nuevas son del punto 54.
// Los estados (confirmado, pendiente, declinado) usan los tokens de ESTADO y además se leen por la FORMA
// (✓ / ⏳ / ✗ y el texto), nunca solo por el color.
export const C = {
  bg: 'var(--anc-bg)',
  card: 'var(--anc-panel)',
  solid: 'var(--anc-panel-solid)',     // barras fijas: opacas, el contenido no se «filtra» detrás
  sunk: 'var(--anc-sunk)',
  ink: 'var(--anc-ink)',
  ink2: 'var(--anc-ink-2)',
  muted: 'var(--anc-ink-3)',           // texto secundario
  faint: 'var(--anc-ink-4)',           // solo texto grande / íconos
  rule: 'var(--anc-rule)',             // filete
  ring: 'var(--anc-ring)',             // borde de controles
  accent: 'var(--anc-accent)',
  onAccent: 'var(--anc-on-accent)',
  hero: 'var(--anc-hero)',
  onHero: 'var(--anc-on-hero)',
  ok: 'var(--anc-ok)', okBg: 'var(--anc-ok-bg)', onOk: 'var(--anc-on-ok)',
  pe: 'var(--anc-pe)', peBg: 'var(--anc-pe-bg)',
  no: 'var(--anc-no)', noBg: 'var(--anc-no-bg)',
  e1: 'var(--anc-e1)', e2: 'var(--anc-e2)',
} as const

/** Un token con transparencia (sin hex ni rgba): `mix(C.onHero, 12)` = 12% de ese color. */
export const mix = (token: string, pct: number) => `color-mix(in srgb, ${token} ${pct}%, transparent)`

/** Colores de la insignia de una invitación: «tu rol cambió» y «pendiente» son ámbar; confirmado, verde; declinado, rojo. */
export function statusColors(status: string | undefined | null, needsReassignment?: boolean | null): { background: string; color: string } {
  if (needsReassignment) return { background: C.peBg, color: C.pe }
  if (status === 'confirmado') return { background: C.okBg, color: C.ok }
  if (status === 'declinado') return { background: C.noBg, color: C.no }
  return { background: C.peBg, color: C.pe }
}
