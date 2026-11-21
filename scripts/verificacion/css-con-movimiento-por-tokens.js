// Los CSS que YA animan con los tokens de movimiento de app/globals.css (plan de animaciones). Cada etapa agrega aquí los archivos que toca; tests/portal/movimiento-tokens.test.js comprueba que en ellos
// toda duración (transition / animation) sale de var(--anc-dur-…) y que solo se anima lo permitido: transform, opacity y scale (la propiedad de escala suelta, que es un transform) y, solo donde se dice, lo que
// el botón heredado ya animaba antes (fondo, color). Etapa M0: ninguno. Etapa M1: la hoja de respuesta al toque. Etapa M6 (la lente de portal-nav.module.css, con `solo`). Etapas M4 (tira-dias.module.css) y M5 (los avisos de add-person-dialog.module.css, con `solo`: solo se miran esas reglas). Etapa M3: ventanas.module.css (y ancora-movimiento.css con las ventanas, la pantalla Adjuntos y los menús que crecen). Etapa M2: la hoja de las hojas inferiores del portal (hoja.module.css; sus animaciones de
// escritorio, dentro de @media (min-width:769px), son las de siempre y el test no las mira). 
module.exports = [
  { archivo: 'app/ancora-movimiento.css', propiedades: ['scale', 'translate', 'opacity', 'background', 'color'] },     // background y color: solo los botones heredados (.anc-rowMore, .anc-dClose, .anc-fav) que ya los animaban
  { archivo: 'app/portal/_components/disponibilidad/hoja.module.css', propiedades: ['translate'] },        // M2: la hoja del día, del rango y «Escribirle a…» (≤ 768 px)
  { archivo: 'components/ventanas/ventanas.module.css', propiedades: [] },                                  // M3: la entrada de siempre de la ventana (sin <Presente>), con los tokens
  { archivo: 'components/home/tira-dias.module.css', propiedades: ['height', 'color', 'font-weight', 'background-color', 'box-shadow'] },      // M4: la tarjeta, las píldoras y la hoja de la tira; el alto de la tarjeta y los colores de estado ya se animaban
  { archivo: 'components/add-person-dialog.module.css', solo: ['.toast', '.notice'], propiedades: [] },                                         // M5: solo los avisos (el resto del archivo es del diálogo, de escritorio)
  { archivo: 'app/portal/_components/portal-nav.module.css', solo: ['.lente', '.zoom'], propiedades: ['width', 'box-shadow', 'transform-origin'] },      // M6: la lente del menú inferior; su ancho, su sombra y el origen del zoom ya se animaban
]
