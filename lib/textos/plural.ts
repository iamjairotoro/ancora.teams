// Concordancia de número para los textos de interfaz (1 cosa / 0 cosas / 5 cosas). El cero va en plural, como en español.
// Un texto con un número delante no se escribe a mano con «s» ni con «(s)»: pasa por aquí. La prueba tests/textos/plural.test.js lo vigila.

/** La palabra que corresponde a `n`: `uno` solo si n es 1. */
export const plural = (n: number, uno: string, varios: string): string => (n === 1 ? uno : varios)

/** El número con su palabra: «1 cosa», «0 cosas», «5 cosas». */
export const contar = (n: number, uno: string, varios: string): string => `${n} ${plural(n, uno, varios)}`
