// Los CSS que YA animan con los tokens de movimiento de app/globals.css (plan de animaciones). Cada etapa agrega aquí los archivos que toca; tests/portal/movimiento-tokens.test.js comprueba que en ellos
// toda duración (transition / animation) sale de var(--anc-dur-…) y que solo se anima lo permitido: transform, opacity y scale (la propiedad de escala suelta, que es un transform) y, solo donde se dice, lo que
// el botón heredado ya animaba antes (fondo, color). Etapa M0: ninguno. Etapa M1: la hoja de respuesta al toque.
module.exports = [
  { archivo: 'app/ancora-movimiento.css', propiedades: ['scale', 'opacity', 'background', 'color'] },     // background y color: solo los botones heredados (.anc-rowMore, .anc-dClose, .anc-fav) que ya los animaban
]
