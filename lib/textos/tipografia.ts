// Textos de la ventana «Tipografía» de la letra de las canciones en teléfono (app/portal/_components/tipografia/VentanaTipografia.tsx).
export const TEXTOS_TIPOGRAFIA = {
  boton: 'Tipografía',
  aa: 'Aa',
  ventana: 'Tipografía de la letra',
  fuente: 'Fuente',
  tamano: 'Tamaño',
  pie: 'Se guarda en tu perfil y vale para todas las canciones.',
  errorGuardar: 'No se pudo guardar tu elección; vale solo mientras tengas esta pantalla abierta.',
} as const
/** Un nombre por paso del tamaño, del más chico al más grande (los cuatro pasos de SIZE_STEPS). */
export const NOMBRES_TAMANO = ['Pequeño', 'Normal', 'Grande', 'Muy grande'] as const
export const etiquetaPasoTamano = (i: number): string => NOMBRES_TAMANO[i] ?? `Tamaño ${i + 1}`
