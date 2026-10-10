// Tablas de setlist de los correos (punto 59). El TONO del bloque (service_blocks.tono / setlist_items.tono) es de la
// biblioteca: solo va en el correo de quien tiene acceso a ella (se decide POR DESTINATARIO con
// lib/auth/libraryAccess.ts). Quien no tiene acceso —o si la lectura falla— recibe la tabla SIN la columna «Tono».
// Los nombres y artistas de las canciones y el lead siguen yendo a todos los asignados. Función pura: sin acceso a datos.

type Item = { orden?: number | string; tono?: string | null; song?: { nombre?: string | null } | null; lead?: { nombre?: string | null } | null }

/** Tabla del correo de invitación y de reasignación (mismo diseño en ambos). */
export function inviteSetlistTable(setlist: Item[], showTono: boolean): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
          <tr style="background:#1A1A1A;color:#F5F0E6">
            <th style="padding:8px;text-align:left">#</th>
            <th style="padding:8px;text-align:left">Canción</th>${showTono ? `
            <th style="padding:8px;text-align:left">Tono</th>` : ''}
            <th style="padding:8px;text-align:left">Lead</th>
          </tr>
          ${setlist.map(item => `
            <tr style="border-bottom:1px solid #E4E3DF">
              <td style="padding:8px;color:#888">${item.orden}</td>
              <td style="padding:8px;font-weight:500">${item.song?.nombre || '—'}</td>${showTono ? `
              <td style="padding:8px;color:#888">${item.tono || '—'}</td>` : ''}
              <td style="padding:8px">${item.lead?.nombre || '—'}</td>
            </tr>`).join('')}
        </table>`
}

/** Encabezado y filas del recordatorio de 24 h (diseño propio). */
export function reminderSetlist(setlist: Item[], showTono: boolean): { head: string; rows: string } {
  const head = `<tr style="background:#1F2A44;color:white">
          <th style="padding:7px 8px;text-align:left;font-size:12px">#</th>
          <th style="padding:7px 8px;text-align:left;font-size:12px">Canción</th>${showTono ? `
          <th style="padding:7px 8px;text-align:left;font-size:12px">Tono</th>` : ''}
          <th style="padding:7px 8px;text-align:left;font-size:12px">Lead</th>
        </tr>`
  const rows = setlist.map(s =>
    `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 8px;color:#888;font-size:13px">${s.orden}</td>
        <td style="padding:6px 8px;font-size:13px;font-weight:500">${s.song?.nombre || '—'}</td>${showTono ? `
        <td style="padding:6px 8px;font-size:13px;color:#888">${s.tono || '—'}</td>` : ''}
        <td style="padding:6px 8px;font-size:13px">${s.lead?.nombre || '—'}</td>
      </tr>`).join('')
  return { head, rows }
}
