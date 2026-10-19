// La escala del teléfono (punto 54; extendida a /admin y /home en la fase 2a): `--esc` es el factor de tamaño de TODO en pantallas ≤ 768 px (0.85) y 1 en escritorio. No es `zoom` ni `transform`: es el
// tamaño de letra de la raíz, así que las medidas en `rem` se escalan solas. Los campos de texto de la zona indicada quedan en 16 px (en iOS, menos que eso hace zoom al enfocar).
// PARA CAMBIAR EL FACTOR: el 0.85 de abajo (vale para el portal y la administración a la vez).
export function cssEscala(selectorCampos: string): string {
  return `:root{--esc:1}@media (max-width:768px){:root{--esc:.85}}
:root{font-size:calc(100% * var(--esc));--anc-r:calc(var(--r) * var(--esc));--anc-r-s:calc(var(--r-s) * var(--esc));--anc-r-panel:calc(var(--r-panel) * var(--esc))}
${selectorCampos} :is(input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select){font-size:16px}`
}
