// Los CSS que YA animan con los tokens de movimiento de app/globals.css (plan de animaciones). Cada etapa agrega aquí los archivos que toca; tests/portal/movimiento-tokens.test.js comprueba que en ellos
// toda duración (transition / animation) sale de var(--anc-dur-…) y que solo se anima lo permitido: transform, opacity y scale (la propiedad de escala suelta, que es un transform) y, solo donde se dice, lo que
// el botón heredado ya animaba antes (fondo, color). Etapa M0: ninguno. Etapa M1: la hoja de respuesta al toque. Etapa M3: ventanas.module.css (y ancora-movimiento.css con las ventanas, la pantalla Adjuntos y los menús que crecen). Etapa M2: la hoja de las hojas inferiores del portal (hoja.module.css; sus animaciones de
// escritorio, dentro de @media (min-width:769px), son las de siempre y el test no las mira). components/home/tira-dias.module.css entra en M4: aún tiene las duraciones sueltas de la tarjeta y las píldoras.
module.exports = [
  { archivo: 'app/ancora-movimiento.css', propiedades: ['scale', 'translate', 'opacity', 'background', 'color'] },     // background y color: solo los botones heredados (.anc-rowMore, .anc-dClose, .anc-fav) que ya los animaban
  { archivo: 'app/portal/_components/disponibilidad/hoja.module.css', propiedades: ['translate'] },        // M2: la hoja del día, del rango y «Escribirle a…» (≤ 768 px)
  { archivo: 'components/ventanas/ventanas.module.css', propiedades: [] },                                  // M3: la entrada de siempre de la ventana (sin <Presente>), con los tokens
]
