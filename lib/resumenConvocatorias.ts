// Totales de convocatorias POR PERSONA (punto 52). Hay una invitación por (servicio, persona, equipo): quien sirve en dos equipos tiene dos filas, pero
// en los totales («3 de 5 confirmados») sigue siendo UNA persona. Sin acceso a datos: lo usan Home y las pruebas.
export interface InvResumen { member_id: string; status: string; sent_at?: string | null }

export function resumenPorPersona(invs: InvResumen[]) {
  const convocadas = new Set<string>(), confirmadas = new Set<string>(), pendientes = new Set<string>()
  for (const i of invs) {
    if (i.sent_at) convocadas.add(i.member_id)
    if (i.status === 'confirmado') confirmadas.add(i.member_id)
    else if (i.status === 'pendiente') pendientes.add(i.member_id)
  }
  // Quien ya confirmó en algún equipo no «falta confirmar» aunque otra convocatoria suya siga pendiente.
  confirmadas.forEach(id => pendientes.delete(id))
  return { convocadas: convocadas.size, confirmadas: confirmadas.size, pendientes: pendientes.size, pendientesIds: Array.from(pendientes) }
}
