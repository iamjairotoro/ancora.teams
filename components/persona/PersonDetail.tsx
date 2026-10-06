/* ══════════════════════════════════════════════════════════════
   PersonDetail.tsx — el CONTENIDO de la ficha de una persona (encabezado,
   acciones, Datos, Equipos y posiciones, Historial), sin carcasa.

   Lo comparten el cajón global (PersonDrawer.tsx, que pone el fondo, Escape,
   el bloqueo de scroll y el foco) y, más adelante, el panel fijo de Personas.
   NO se duplica: cualquier cambio de la ficha se hace acá.

   No consulta Supabase: recibe la persona ya cargada (ver usePersonDetail.ts).
   ══════════════════════════════════════════════════════════════ */

'use client';

/* ── datos ── */

export type ServiceHistoryEntry = {
  id: string;
  dateLabel: string;       // "23 ago"
  positionName: string;    // "Bajo"
  serviceName: string;     // "Servicio Ancora"
  teamName: string;        // "Alabanza"
  status: 'served' | 'declined' | 'pending';
};

export type PersonTeam = {
  teamId: string;
  teamName: string;
  isLeader: boolean;
  positionNames: string[];
};

/* Se llamaba PersonDetail: el nombre es ahora el del componente. PersonDrawer
   reexporta este tipo con el nombre viejo, así que nadie más cambia. */
export type PersonDetailData = {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  phone?: string;
  birthdayLabel?: string;
  joinedLabel?: string;
  availabilityLabel: string;
  hasApp: boolean;
  teams: PersonTeam[];
  stats: { yearCount: number; lastQuarterCount: number; lastServedLabel: string };
  history: ServiceHistoryEntry[];
};

export type PersonDetailProps = {
  person: PersonDetailData | null;
  loading: boolean;
  canEdit: boolean;
  onEdit?: (personId: string) => void;
  onAssign?: (personId: string) => void;
  onMenu?: (personId: string) => void;
  /* Lo que va a la derecha del encabezado: en el cajón, el botón de cerrar
     (con el ref que usa para recibir el foco). */
  headerAction?: React.ReactNode;
};

export default function PersonDetail({
  person, loading, canEdit, onEdit, onAssign, onMenu, headerAction,
}: PersonDetailProps) {
  return (
    <>
      <div className="anc-dHead">
        <div className="anc-dTop">
          <span className="anc-dAvatar" aria-hidden>{person?.initials ?? ''}</span>
          <div className="anc-b">
            <h2>{person?.fullName ?? (loading ? 'Cargando…' : '')}</h2>
            <p className="anc-dSub">{person?.email}</p>
            {person && (
              <div className="anc-badges">
                {person.teams.filter((t) => t.isLeader).map((t) => (
                  <span key={t.teamId} className="anc-badge anc-badge--lead">
                    Líder de {t.teamName}
                  </span>
                ))}
                {person.hasApp && <span className="anc-badge anc-badge--soft">App instalada</span>}
              </div>
            )}
          </div>
          {headerAction}
        </div>

        {person && (
          <div className="anc-dActs">
            {onAssign && (
              <button className="anc-btn anc-btn--accent" onClick={() => onAssign(person.id)}>
                Asignar a un servicio
              </button>
            )}
            {canEdit && onEdit && (
              <button className="anc-btn anc-btn--quiet" onClick={() => onEdit(person.id)}>
                Editar
              </button>
            )}
            {canEdit && onMenu && (
              <button className="anc-btn anc-btn--quiet" onClick={() => onMenu(person.id)}
                      aria-label="Más acciones">···</button>
            )}
          </div>
        )}
      </div>

      <div className="anc-dBody">
        {loading && <p className="anc-dLoading">Cargando ficha…</p>}

        {person && (
          <>
            <section className="anc-dBlock">
              <div className="anc-bTitle"><h3>Datos</h3></div>
              {person.phone && <Kv k="Teléfono" v={person.phone} />}
              {person.birthdayLabel && <Kv k="Cumpleaños" v={person.birthdayLabel} />}
              {person.joinedLabel && <Kv k="Se unió" v={person.joinedLabel} />}
              <Kv k="Disponibilidad" v={person.availabilityLabel} />
            </section>

            <section className="anc-dBlock">
              <div className="anc-bTitle">
                <h3>Equipos y posiciones</h3>
                <span className="anc-n">{person.teams.length} equipos</span>
              </div>
              {person.teams.map((t) => (
                <div key={t.teamId} className="anc-teamBlock">
                  <div className="anc-t">
                    {t.teamName}
                    {t.isLeader && <span className="anc-badge anc-badge--lead">Líder</span>}
                  </div>
                  <div className="anc-chips">
                    {t.positionNames.map((n) => <span key={n} className="anc-chip">{n}</span>)}
                  </div>
                </div>
              ))}
            </section>

            <section className="anc-dBlock">
              <div className="anc-bTitle"><h3>Historial</h3></div>
              <div className="anc-stats">
                <Stat v={person.stats.yearCount} k="servicios este año" />
                <Stat v={person.stats.lastQuarterCount} k="últimos 3 meses" />
                <Stat v={person.stats.lastServedLabel} k="última vez" />
              </div>

              {person.history.length === 0 ? (
                <p className="anc-empty"><b>Sin historial</b>Aún no ha sido convocada.</p>
              ) : (
                person.history.map((h) => (
                  <div key={h.id} className="anc-hist">
                    <span className="anc-date">{h.dateLabel}</span>
                    <span className="anc-b">
                      <span className="anc-role">{h.positionName}</span>
                      <span className="anc-svc">{h.serviceName} · {h.teamName}</span>
                    </span>
                    <span className={`anc-st anc-st--${statusClass(h.status)}`}>
                      {statusLabel(h.status)}
                    </span>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

const Kv = ({ k, v }: { k: string; v: string }) => (
  <div className="anc-kv"><span className="anc-k">{k}</span><span className="anc-v">{v}</span></div>
);
const Stat = ({ v, k }: { v: string | number; k: string }) => (
  <div className="anc-stat"><div className="anc-v">{v}</div><div className="anc-k">{k}</div></div>
);

function statusClass(s: ServiceHistoryEntry['status']) {
  return s === 'served' ? 'ok' : s === 'declined' ? 'no' : 'pending';
}
function statusLabel(s: ServiceHistoryEntry['status']) {
  return s === 'served' ? 'Sirvió' : s === 'declined' ? 'No pudo' : 'Pendiente';
}
