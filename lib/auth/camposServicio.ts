// Listas blancas de columnas de las rutas update-service y service-blocks (punto 50, paso 0a). Viven aquí y NO en los route.ts porque Next.js no admite otras exportaciones en un archivo de ruta
// (rompe `next build`). Salen de leer los llamadores reales (AdminServiceView); tests/auth/servicios.test.js las vuelve a sacar del código de la pantalla.
export const CAMPOS_SERVICIO_EDITABLES = ['hora_inicio', 'hora_fin']
//   · POST  (addBlock):   service_id, orden, tipo, titulo, duracion_min
//   · PATCH (updateBlock, EditPanel, reordenar): tipo, titulo, song_id, tono, lead_id, duracion_min, notas, orden   — service_id NO: un bloque no cambia de servicio
export const CAMPOS_BLOQUE_NUEVO = ['service_id', 'orden', 'tipo', 'titulo', 'duracion_min']
export const CAMPOS_BLOQUE_EDITABLES = ['tipo', 'titulo', 'song_id', 'tono', 'lead_id', 'duracion_min', 'notas', 'orden']
