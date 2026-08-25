// Organización #1 — mismo id fijo que usa migrations/001-organizations.sql.
// Hoy solo existe esta organización (no hay UI de multi-org todavía), así
// que se usa como default explícito en vez de asumir "la única que hay".
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'
