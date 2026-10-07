/* ══════════════════════════════════════════════════════════════
   PersonDetail.tsx — el CONTENIDO de la ficha de una persona (encabezado,
   acciones, Datos, Equipos y posiciones, Historial), sin carcasa.

   Lo comparten el cajón global (PersonDrawer.tsx, que pone el fondo, Escape,
   el bloqueo de scroll y el foco) y, más adelante, el panel fijo de Personas.
   NO se duplica: cualquier cambio de la ficha se hace acá.

   No consulta Supabase: recibe la persona ya cargada (ver usePersonDetail.ts).
   ══════════════════════════════════════════════════════════════ */

'use client';

import { isTeamColor } from '@/lib/teamColors';
import PersonAvatar from '../PersonAvatar';
import AddToTeamMenu, { type AddToTeamControl } from './AddToTeamMenu';
import actionStyles from './add-to-team-menu.module.css';
import AccessLinkControl from './AccessLinkControl';
import { TeamMono, teamBandClass, teamChipClass, teamColorProps, teamNoneClass } from '../TeamColor';

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
  /* punto 43: clave de la paleta del equipo (null = sin color → neutro) */
  color?: string | null;
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
  hasApp: boolean;
  /* punto 44(c): foto (con iniciales de respaldo) y, solo para owner/admin, la
     última conexión en fecha relativa («Nunca» si no hay). */
  avatarUrl?: string | null;
  lastSeenLabel?: string;
  /* Rol de organización (organization_members): 'owner' | 'admin'; null/ausente =
     integrante. Solo se MUESTRA a quien puede editar (canEdit). */
  role?: 'owner' | 'admin' | null;
  teams: PersonTeam[];
  stats: { yearCount: number; lastQuarterCount: number; lastServedLabel: string };
  history: ServiceHistoryEntry[];
};

export type LeaderControl = {
  busyTeamId: string | null;
  error: { teamId: string; text: string } | null;
  onToggle: (teamId: string, makeLeader: boolean) => void;
  onClearError: () => void;
};

export type PersonDetailProps = {
  person: PersonDetailData | null;
  loading: boolean;
  canEdit: boolean;
  onEdit?: (personId: string) => void;
  onAssign?: (personId: string) => void;
  onMenu?: (personId: string) => void;
  /* Solo el panel de Personas los pasa (el cajón no). «Agregar a un equipo» es un
     menú con los equipos a los que la persona aún no pertenece (la escritura la
     hace el padre, ver lib/addToTeam.ts); «Ver perfil completo» lleva a la vista
     de perfil. Los dos solo se ofrecen a quien puede editar (canEdit). */
  addToTeam?: AddToTeamControl;
  /* «Hacer líder» / «Quitar liderazgo» en la banda de cada equipo (owner y admin,
     sin confirmación). La escritura la hace el padre (lib/setTeamLeader.ts). */
  leaders?: LeaderControl;
  /* Lo que va a la derecha del encabezado: en el cajón, el botón de cerrar
     (con el ref que usa para recibir el foco). */
  headerAction?: React.ReactNode;
};

export default function PersonDetail({
  person, loading, canEdit, onEdit, onAssign, onMenu, addToTeam, leaders, headerAction,
}: PersonDetailProps) {
  // «Admin» / «Propietario»: de solo lectura y solo para quien puede editar
  // (owner/admin); un líder o una vista de solo lectura no lo ve.
  const roleLabel = canEdit ? (person?.role === 'owner' ? 'Propietario' : person?.role === 'admin' ? 'Admin' : null) : null;
  return (
    <>
      <div className="anc-dHead">
        <div className="anc-dTop">
          <PersonAvatar className="anc-dAvatar" url={person?.avatarUrl} initials={person?.initials ?? ''} />
          <div className="anc-b">
            <h2>{person?.fullName ?? (loading ? 'Cargando…' : '')}</h2>
            <p className="anc-dSub">{person?.email}</p>
            {person && (
              <div className="anc-badges">
                {canEdit && roleLabel && (
                  <span className={`anc-badge ${roleLabel === 'Admin' ? 'anc-badge--admin' : 'anc-badge--soft'}`}>{roleLabel}</span>
                )}
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
              <div className="anc-bTitle"><h3>Contacto</h3></div>
              {person.email && <Kv k="Correo" v={person.email} />}
              {person.phone && <Kv k="Teléfono" v={person.phone} />}
              {person.birthdayLabel && <Kv k="Cumpleaños" v={person.birthdayLabel} />}
              {person.joinedLabel && <Kv k="Se unió" v={person.joinedLabel} />}
            </section>

            {canEdit && person.lastSeenLabel !== undefined && (
              <section className="anc-dBlock">
                <div className="anc-bTitle"><h3>En la app</h3></div>
                <Kv k="Última conexión" v={person.lastSeenLabel} />
                <Kv k="App instalada" v={person.hasApp ? 'Sí' : 'No'} />
                {/* punto 48: enlace de acceso personal (owner/admin); pieza delgada, ver AccessLinkControl */}
                <AccessLinkControl key={person.id} personId={person.id} />
              </section>
            )}

            <section className="anc-dBlock">
              <div className="anc-bTitle">
                <h3>Equipos y posiciones</h3>
                <span className="anc-n">{person.teams.length} equipos</span>
                {person.teams.length > 0 && canEdit && addToTeam && (
                  <span style={{ marginLeft: 'auto' }}><AddToTeamMenu control={addToTeam} quiet /></span>
                )}
              </div>
              {person.teams.length === 0 && (
                <div className="anc-teamBlock">
                  <p className={teamNoneClass} style={{ marginBottom: addToTeam && canEdit ? 8 : 0 }}>
                    Aún no está en ningún equipo
                  </p>
                  {canEdit && addToTeam && <AddToTeamMenu control={addToTeam} />}
                </div>
              )}
              {person.teams.map((t) => (
                <div key={t.teamId} className="anc-teamBlock">
                  <div className={`anc-t ${teamBandClass}`} {...teamColorProps(t.color)}>
                    <TeamMono name={t.teamName} color={t.color} />
                    {t.teamName}
                    {t.isLeader && <span className="anc-badge anc-badge--lead">Líder</span>}
                    {canEdit && leaders && (
                      <button type="button" className={actionStyles.leaderBtn} disabled={leaders.busyTeamId !== null}
                        onClick={() => leaders.onToggle(t.teamId, !t.isLeader)}>
                        {leaders.busyTeamId === t.teamId ? 'Guardando…' : t.isLeader ? 'Quitar liderazgo' : 'Hacer líder'}
                      </button>
                    )}
                  </div>
                  {leaders?.error?.teamId === t.teamId && (
                    <p className={actionStyles.err} role="alert">
                      <span>{leaders.error.text}</span>
                      <button type="button" onClick={leaders.onClearError}>Cerrar</button>
                    </p>
                  )}
                  <div className="anc-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {t.positionNames.length === 0 && (
                      <span className={teamNoneClass}>Sin posiciones asignadas todavía</span>
                    )}
                    {t.positionNames.map((n) => (isTeamColor(t.color)
                      ? <span key={n} className={teamChipClass} data-team={t.color}>{n}</span>
                      : <span key={n} className="anc-chip">{n}</span>))}
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
