/* ════════════════════════════════════════════════════════════════════════
   Home.tsx — pantalla de inicio (vista de líder / admin)
   ORIGEN: docs/mockup-home.html (v1) + docs/mockup-home-v2.html (layout y
   calendario interactivo, punto 15 de docs/PENDIENTES-code.md).

   REGLAS
   1. NO trae datos. Todo llega por props; las consultas viven en la page.
   2. Las clases y la estructura del DOM se editan SOLO cuando un punto de
      PENDIENTES-code.md lo pide explícitamente (como el 15) — nunca por
      iniciativa propia ni para "mejorar" algo que no se pidió. Prefijo
      anc- en todo.
   3. Ningún `#` de color fuera de un SVG.
   4. Los estados se distinguen SIEMPRE por forma además de color:
      círculo relleno = confirmó, contorno = pendiente, tachado = no puede.
      No quitar la forma aunque haya color.
   5. NUNCA agregar porcentajes de cumplimiento individual. «Cómo se reparte
      la carga» es un dato de distribución, no una evaluación de personas
      voluntarias. Ver la nota del mockup.
   ════════════════════════════════════════════════════════════════════════ */

'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TeamDot } from '../TeamColor';

export type RsvpStatus = 'confirmed' | 'declined' | 'pending';

export type CalendarDay = {
  label: string;
  dateISO: string;      // "2026-09-06" — clave de click y de comparación con el día abierto
  inMonth: boolean;
  hasService: boolean;
  hasBlock: boolean;    // alguien bloqueó esta fecha — cuadrito arriba a la derecha
  isToday: boolean;
};

// Punto 14: conteo (sin nombres) de bloqueados de un equipo que quien mira
// NO administra — "2 personas de Producción y 1 de Logística".
export type OtherTeamBlocked = { teamName: string; count: number };

// blocksPanel = el panel «Por persona / Por equipo» (components/DayBlocksPanel.tsx, punto 60), armado
// en la page con las filas por equipo de team_blocks_in_range: un admin/owner ve todos los equipos; un
// líder, solo el suyo.
// otherTeamsBlocked = el resto, solo como conteo por equipo — vacío para
// admin/owner (ya ven todo en `blocked`), poblado para un líder.
export type DayDetail = {
  dateISO: string;
  dateLabel: string;    // "Domingo 6 de Septiembre"
  service: { title: string; timeRange: string; onOpen: () => void } | null;
  blocksPanel: ReactNode;
  otherTeamsBlocked: OtherTeamBlocked[];
};

export type AttentionItem = {
  id: string;
  count: number;
  title: string;
  detail: string;
  actionLabel: string;        // "Asignar", "Recordar", "Cargar"
  onAction: () => void;
  emphasis?: boolean;          // el más urgente lleva el badge sólido
};

export type UpcomingService = {
  id: string;
  dayNumber: string;           // "20"
  title: string;               // "Domingo 20 de Septiembre"
  detail: string;              // "9 de 14 confirmados · 3 sin cubrir"
  isNext: boolean;
};

export type Birthday = {
  id: string; dayNumber: string; name: string; roleLabel: string;
};

export type TeamTab = { id: string; name: string; memberCount: number; color?: string | null };

export type RosterSlot = {
  id: string; code: string; personName: string | null; status: RsvpStatus | null;
};

export type TeamResponse = {
  teamId: string; teamName: string; color?: string | null;
  confirmedPct: number; declinedPct: number; noReplyPct: number;
};

export type VolunteerLoad = {
  personId: string; initials: string; name: string;
  count: number; maxCount: number;   // maxCount = el mayor del grupo, para la escala
};

export type HomeProps = {
  greeting: string;            // "Hola, Claudia"
  todayLabel: string;          // "Sábado 19 de Septiembre · el próximo servicio es mañana"

  // true mientras loadBase() (la page) todavía no trajo services/members —
  // hasta entonces no se sabe si hay próximo servicio, ni si "nadie más
  // cumple este mes", ni si "todo está al día". Esqueleto, nunca el
  // estado vacío adivinado.
  loading: boolean;
  // Si loadBase() falla, el esqueleto no se queda para siempre — se
  // reemplaza por esto. null = sin error (loading o contenido real).
  error: string | null;
  onRetry: () => void;

  next: {
    whenLabel: string;         // "MAÑANA · 10:00"
    title: string;
    meta: string;
    calledCount: number; confirmedCount: number; uncoveredCount: number;
    songCount: number;
    pendingCount: number;
    onOpen: () => void;
    onRemind: () => void;
  } | null;

  calendar: {
    monthLabel: string; days: CalendarDay[]; onPrev: () => void; onNext: () => void;
    selectedDate: string | null;
    dayDetail: DayDetail | null;
    onDayClick: (dateISO: string) => void;
    onCloseDay: () => void;
  };

  attention: AttentionItem[];
  upcoming: UpcomingService[];

  birthdayToday: Birthday | null;      // null = no se renderiza el bloque oscuro
  birthdaysThisMonth: Birthday[];
  monthLabel: string;
  onGreet?: (personId: string) => void;

  teamTabs: TeamTab[];
  activeTeamId: string;
  onTeamChange: (id: string) => void;
  roster: RosterSlot[];

  teamResponses: TeamResponse[];
  volunteerLoad: VolunteerLoad[];
  onPersonClick: (personId: string) => void;   // abre el PersonDrawer
};

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function Home(p: HomeProps) {
  // Nunca un esqueleto infinito: si loadBase() falló, esto reemplaza todo
  // el contenido (el esqueleto de más abajo es solo para "todavía no
  // llegó", no para "nunca va a llegar").
  if (p.error) {
    return (
      <div className="anc-panel" style={{ maxWidth: 420, margin: '64px auto', padding: 28, textAlign: 'center' }}>
        <p style={{ fontSize: '.875rem', fontWeight: 700, marginBottom: 8 }}>No se pudo cargar Home</p>
        <p className="anc-empty" style={{ marginBottom: 18 }}>{p.error}</p>
        <button onClick={p.onRetry}
          style={{ background: 'var(--anc-accent)', color: 'var(--anc-on-accent)', border: 'none', borderRadius: 'var(--anc-r)', padding: '9px 18px', fontSize: '.8125rem', fontWeight: 600, cursor: 'pointer' }}>
          Reintentar
        </button>
      </div>
    );
  }

  const cols = chunk(p.roster, Math.ceil(p.roster.length / 3) || 1);

  return (
    <>
      <h1 className="anc-hi">{p.greeting}</h1>
      <p className="anc-hiSub">{p.todayLabel}</p>

      {/* ── fila 1: próximo servicio + calendario ──
          Los dos hijos llevan grid-column explícito: si "next" viniera
          ausente (antes: cargando, ahora nunca — ver p.loading/p.next
          abajo) el calendario NUNCA debe poder ocupar la columna 1
          (angosta) por default-placement de CSS grid. */}
      <div className="anc-hGrid">
        <div className="anc-next" style={{ gridColumn: 1 }}>
          {p.loading ? (
            <div aria-hidden="true">
              <div className="anc-skel anc-skel--dark" style={{ width: 90, height: 9, marginBottom: 10 }} />
              <div className="anc-skel anc-skel--dark" style={{ width: 150, height: 22, marginBottom: 9 }} />
              <div className="anc-skel anc-skel--dark" style={{ width: 190, height: 11, marginBottom: 16 }} />
              <div className="anc-nextGrid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="anc-nx">
                    <div className="anc-skel anc-skel--dark" style={{ width: 26, height: 19, marginBottom: 6 }} />
                    <div className="anc-skel anc-skel--dark" style={{ width: 48, height: 8 }} />
                  </div>
                ))}
              </div>
              <div className="anc-skel anc-skel--dark" style={{ width: 118, height: 32, borderRadius: 'var(--anc-r)' }} />
            </div>
          ) : p.next ? (
            <>
              <p className="anc-when">{p.next.whenLabel}</p>
              <h2>{p.next.title}</h2>
              <p className="anc-meta">{p.next.meta}</p>
              <div className="anc-nextGrid">
                <div className="anc-nx"><div className="anc-v">{p.next.calledCount}</div>
                  <div className="anc-k">convocados</div></div>
                <div className="anc-nx"><div className="anc-v">{p.next.confirmedCount}</div>
                  <div className="anc-k">confirmados</div></div>
                <div className="anc-nx"><div className="anc-v">{p.next.uncoveredCount}</div>
                  <div className="anc-k">sin cubrir</div></div>
                <div className="anc-nx"><div className="anc-v">{p.next.songCount}</div>
                  <div className="anc-k">canciones</div></div>
              </div>
              <div className="anc-acts">
                <button className="anc-btnLight" onClick={p.next.onOpen}>Abrir servicio</button>
                {/* si no hay pendientes, el botón no se renderiza: no invita a nada */}
                {p.next.pendingCount > 0 && (
                  <button className="anc-btnGhostDark" onClick={p.next.onRemind}>
                    Recordar a los {p.next.pendingCount} pendientes
                  </button>
                )}
              </div>
            </>
          ) : (
            <div>
              <p className="anc-when">SIN PRÓXIMO SERVICIO</p>
              <h2 style={{ opacity: .75 }}>Todavía no hay ninguno programado</h2>
              <p className="anc-meta">Cuando crees un servicio nuevo, va a aparecer acá.</p>
            </div>
          )}
        </div>

        <div className="anc-panel" style={{ padding: '11px 12px 12px', position: 'relative', gridColumn: 2 }}>
          <div className="anc-calTop">
            <b>{p.calendar.monthLabel}</b>
            <button className="anc-calNav" onClick={p.calendar.onPrev} aria-label="Mes anterior">
              <ChevronLeft size={14} />
            </button>
            <button className="anc-calNav" onClick={p.calendar.onNext} aria-label="Mes siguiente">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="anc-calGrid">
            {DOW.map((d, i) => <span key={i} className="anc-dow">{d}</span>)}
            {p.calendar.days.map((d, i) => (
              <button
                type="button"
                key={i}
                onClick={() => p.calendar.onDayClick(d.dateISO)}
                className={[
                  'anc-day',
                  d.inMonth ? '' : 'anc-day--out',
                  d.hasService ? 'anc-day--svc' : '',
                  d.hasBlock ? 'anc-day--blk' : '',
                  d.isToday ? 'anc-day--today' : '',
                  d.dateISO === p.calendar.selectedDate ? 'anc-day--open' : '',
                ].filter(Boolean).join(' ')}
              >{d.label}</button>
            ))}
          </div>

          {/* panel del día — entra por el costado al tocar una fecha.
              Ver DayDetail: sin split "tu equipo/otros" hasta el punto 14. */}
          {p.calendar.dayDetail && (
            <>
              <div className="anc-dayScrim" onClick={p.calendar.onCloseDay} />
              <div className="anc-dayPanel">
                <div className="anc-dayPanelInner">
                  <div className="anc-dpHead">
                    <b>{p.calendar.dayDetail.dateLabel}</b>
                    <button className="anc-dpClose" onClick={p.calendar.onCloseDay} aria-label="Cerrar">✕</button>
                  </div>

                  {p.calendar.dayDetail.service ? (
                    <button className="anc-dpService" onClick={p.calendar.dayDetail.service.onOpen}>
                      <span className="anc-dpServiceInfo">
                        <b>{p.calendar.dayDetail.service.title}</b>
                        {p.calendar.dayDetail.service.timeRange && <span>{p.calendar.dayDetail.service.timeRange}</span>}
                      </span>
                      <span className="anc-go">Abrir ›</span>
                    </button>
                  ) : (
                    <p className="anc-dpNoService">Sin servicio ni ensayo este día.</p>
                  )}

                  <p className="anc-dpLbl">NO DISPONIBLES</p>
                  {p.calendar.dayDetail.blocksPanel}

                  {/* punto 14/15: el resto de los equipos, solo como conteo
                      — un líder ve el detalle de su equipo arriba, pero de
                      los demás solo necesita saber si el día está flojo. */}
                  {p.calendar.dayDetail.otherTeamsBlocked.length > 0 && (
                    <p className="anc-dpOtherTeams">{formatOtherTeams(p.calendar.dayDetail.otherTeamsBlocked)}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── fila 2: atención · próximos · cumpleaños — tres columnas iguales
          (punto 15: antes eran dos desparejas, con próximos+cumpleaños
          apiladas dentro de la segunda) ── */}
      <div className="anc-hRow2">
        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Necesita atención</h2>
            <span className="anc-n">{p.attention.length} cosas</span>
          </div>
          <div className="anc-cBody">
            {p.loading ? (
              <SkeletonRows />
            ) : p.attention.length === 0 ? (
              <p className="anc-empty"><b>Todo al día</b>No hay nada pendiente por ahora.</p>
            ) : p.attention.map((a) => (
              <button key={a.id} className="anc-alert" onClick={a.onAction}>
                <span className={`anc-ic${a.emphasis ? ' anc-ic--solid' : ''}`}>{a.count}</span>
                <span className="anc-b">
                  <span className="anc-t">{a.title}</span>
                  <span className="anc-s">{a.detail}</span>
                </span>
                <span className="anc-go">{a.actionLabel} ›</span>
              </button>
            ))}
          </div>
        </div>

        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Próximos servicios</h2>
            <span className="anc-spacer" />
            <button className="anc-link">Ver todos</button>
          </div>
          <div className="anc-cBody" style={{ paddingTop: 8 }}>
            {p.loading ? <SkeletonRows /> : p.upcoming.map((s) => (
              <button key={s.id} className="anc-alert">
                <span className={`anc-ic${s.isNext ? ' anc-ic--solid' : ''}`}>{s.dayNumber}</span>
                <span className="anc-b">
                  <span className="anc-t">{s.title}</span>
                  <span className="anc-s">{s.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Cumpleaños</h2>
            <span className="anc-n">{p.monthLabel}</span>
            <span className="anc-spacer" />
            <button className="anc-link">Ver todos</button>
          </div>

          {/* si no hay nadie hoy, este bloque NO se renderiza.
              Un «hoy no cumple nadie» sería ruido. */}
          {p.birthdayToday && (
            <div className="anc-bdayToday">
              <span className="anc-cake"><CakeIcon /></span>
              <span className="anc-b">
                <span className="anc-t">Hoy cumple {p.birthdayToday.name}</span>
                <span className="anc-s">{p.birthdayToday.roleLabel}</span>
              </span>
              {p.onGreet && (
                <button className="anc-bdaySend"
                        onClick={() => p.onGreet!(p.birthdayToday!.id)}>Saludar</button>
              )}
            </div>
          )}

          <div className="anc-cBody" style={{ paddingTop: 10 }}>
            {p.loading ? (
              <SkeletonRows />
            ) : p.birthdaysThisMonth.length === 0 ? (
              <p className="anc-empty">Nadie más cumple este mes.</p>
            ) : (
              <>
                <p className="anc-bdayLbl">MÁS ADELANTE ESTE MES</p>
                {p.birthdaysThisMonth.map((b) => (
                  <button key={b.id} className="anc-bday" onClick={() => p.onPersonClick(b.id)}>
                    <span className="anc-d">{b.dayNumber}</span>
                    <span className="anc-nm">{b.name}</span>
                    <span className="anc-tm">{b.roleLabel}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── fila 3: nómina por equipo ── */}
      <div className="anc-panel" style={{ marginBottom: 16 }}>
        <div className="anc-hTabs" role="tablist">
          {p.teamTabs.map((t) => (
            <button key={t.id} role="tab" className="anc-hTab"
                    aria-selected={t.id === p.activeTeamId}
                    onClick={() => p.onTeamChange(t.id)}>
              <TeamDot color={t.color} /> {t.name} <span className="anc-c">{t.memberCount}</span>
            </button>
          ))}
        </div>
        <div className="anc-cBody">
          <div className="anc-hGrid3">
            {cols.map((col, i) => (
              <div key={i}>
                {col.map((s) => (
                  <div key={s.id} className="anc-hSlot">
                    <span className="anc-code">{s.code}</span>
                    <span className={`anc-who${s.personName ? '' : ' anc-who--free'}`}>
                      {s.personName ?? 'Sin asignar'}
                    </span>
                    {s.status && (
                      <span className={`anc-stDot anc-stDot--${dotClass(s.status)}`}>
                        {s.status === 'confirmed' ? '✓' : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── fila 4: los dos gráficos ── */}
      <div className="anc-hGrid2">
        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Respuesta por equipo</h2><span className="anc-n">últimos 3 meses</span>
          </div>
          <div className="anc-cBody">
            <div className="anc-bars">
              {p.teamResponses.map((t) => (
                <div key={t.teamId} className="anc-bar">
                  <span className="anc-lb"><TeamDot color={t.color} /> {t.teamName}</span>
                  <span className="anc-track">
                    <span className="anc-f1" style={{ width: `${t.confirmedPct}%` }} />
                    <span className="anc-f2" style={{ width: `${t.declinedPct}%` }} />
                    <span className="anc-f3" style={{ width: `${t.noReplyPct}%` }} />
                  </span>
                  <span className="anc-vv">{t.confirmedPct}%</span>
                </div>
              ))}
            </div>
            <div className="anc-legend">
              <span><i style={{ background: 'var(--anc-ok)' }} />Confirmó</span>
              <span><i style={{ background: 'var(--anc-no)' }} />No pudo</span>
              <span><i className="anc-f3" />No respondió</span>
            </div>
          </div>
        </div>

        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Cómo se reparte la carga</h2><span className="anc-n">últimos 3 meses</span>
            <span className="anc-spacer" />
            <button className="anc-link">Ver todos</button>
          </div>
          <div className="anc-cBody">
            {/* ordenado de MÁS a MENOS: el dato valioso está abajo —
                quién está quedando fuera de la rotación */}
            {p.volunteerLoad.map((v) => (
              <button key={v.personId} className="anc-load"
                      onClick={() => p.onPersonClick(v.personId)}>
                <span className="anc-av">{v.initials}</span>
                <span className="anc-nm">{v.name}</span>
                <span className="anc-dots">
                  {Array.from({ length: v.maxCount }).map((_, i) => (
                    <i key={i} className={i < v.count ? 'anc-on' : ''} />
                  ))}
                </span>
                <span className="anc-tag">
                  {v.count === 0 ? 'nunca' : v.count === 1 ? '1 vez' : `${v.count} veces`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// 3 filas genéricas — se usa en "Necesita atención", "Próximos servicios"
// y "Cumpleaños" mientras p.loading, en vez de adivinar un estado vacío.
function SkeletonRows() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="anc-skel" style={{ width: 26, height: 26, borderRadius: 'var(--anc-r)', flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <div className="anc-skel" style={{ width: `${60 - i * 10}%`, height: 10, marginBottom: 6 }} />
            <div className="anc-skel" style={{ width: `${40 - i * 6}%`, height: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function dotClass(s: RsvpStatus) {
  return s === 'confirmed' ? 'ok' : s === 'declined' ? 'no' : 'pending';
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function formatOtherTeams(others: OtherTeamBlocked[]): string {
  const parts = others.map(o => `${o.count} persona${o.count !== 1 ? 's' : ''} de ${o.teamName}`);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
}

const CakeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 21h18M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M8 13V9M12 13V9M16 13V9" />
    <path d="M8 6.5c0-1 1-1.5 1-2.5 0 1 1 1.5 1 2.5M14 6.5c0-1 1-1.5 1-2.5 0 1 1 1.5 1 2.5" />
  </svg>
);
