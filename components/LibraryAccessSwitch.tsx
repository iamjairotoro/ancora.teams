'use client'
/* Interruptor de acceso a la biblioteca de canciones por equipo (punto 59). Solo pinta: quien lo usa guarda por la
   ruta de servidor /api/admin/teams/library-access y pasa `busy` mientras guarda (el interruptor queda
   deshabilitado) y `error` si falló (visible, con el valor anterior intacto). */
import styles from './library-access-switch.module.css'

export default function LibraryAccessSwitch({ value, busy, error, onToggle }: {
  value: boolean
  busy: boolean
  error: string | null
  onToggle: (next: boolean) => void
}) {
  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>Biblioteca de canciones</h3>
      <button type="button" role="switch" aria-checked={value} disabled={busy} className={styles.row}
        onClick={() => onToggle(!value)}>
        <span className={styles.sw} aria-hidden="true" />
        {busy ? 'Guardando…' : 'Este equipo accede a la biblioteca de canciones y a sus recursos'}
      </button>
      <p className={styles.help}>
        Con esto, las personas de este equipo ven la lista completa, favoritas, tono, BPM, compás, enlaces y notas de las
        canciones. Sin esto ven solo las canciones de su domingo y el detalle del servicio. Propietario y admin siempre acceden.
      </p>
      {error && <p className={styles.err} role="alert">{error}</p>}
    </div>
  )
}
