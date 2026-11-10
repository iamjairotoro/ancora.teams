// Textos de la hoja con acordes en la FICHA de administradora (Modo Admin). Le hablan de tú; sin expresiones de tiempo real.
export const TEXTOS_FICHA = {
  otrasVersiones: (n: number) => `Se muestra la versión principal de ${n === 1 ? '1 sección que tiene' : `${n} secciones que tienen`} otras versiones.`,
  desajuste: 'La letra de la ficha y la de los acordes guardados no coinciden. Aquí se muestran los acordes guardados.',
} as const
