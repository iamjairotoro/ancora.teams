// Organización #1 — mismo id fijo que usa migrations/001-organizations.sql.
// Hoy solo existe esta organización (no hay UI de multi-org todavía), así
// que se usa como default explícito en vez de asumir "la única que hay".
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'

// Cola del grupo "administración" del menú (Chats · Personas · [Admins]),
// compartida entre app/admin/page.tsx (pestañas reales, con onClick) y
// app/home/page.tsx (enlaces hacia /admin?tab=..., con href) para que no
// se desincronicen — "Equipos" dejó de ser un ítem propio: ahora es una
// pestaña DENTRO de "Personas" (ver components/PersonasPanel.tsx).
// "Admins" no entra acá porque cada archivo lo agrega con su propia
// condición (solo owner en /admin; hoy ninguna en /home).
export const ADMIN_MENU_ITEMS: { key: 'chats' | 'personas'; label: string }[] = [
  { key: 'chats', label: 'Chats' },
  { key: 'personas', label: 'Personas' },
]
