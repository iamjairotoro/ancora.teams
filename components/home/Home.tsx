/* ════════════════════════════════════════════════════════════════════════
   Home.tsx — pantalla de inicio (vista de líder / admin)
   ORIGEN: docs/mockup-home.html. Este archivo ES el diseño.

   REGLAS
   1. NO trae datos. Todo llega por props; las consultas viven en la page.
   2. NO cambiar clases ni estructura del DOM. Prefijo anc- en todo.
   3. Ningún `#` de color fuera de un SVG.
   4. Los estados se distinguen SIEMPRE por forma además de color:
      círculo relleno = confirmó, contorno = pendiente, tachado = no puede.
      No quitar la forma aunque haya color.
   5. NUNCA agregar porcentajes de cumplimiento individual. «Cómo se reparte
      la carga» es un dato de distribución, no una evaluación de personas
      voluntarias. Ver la nota del mockup.
   ════════════════════════════════════════════════════════════════════════ */

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export type RsvpStatus = 'confirmed' | 'declined' | 'pending';

export type CalendarDay = {
  label: string;
  inMonth: boolean;
  hasService: boolean;
  isToday: boolean;
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

export type TeamTab = { id: string; name: string; memberCount: number };

export type RosterSlot = {
  id: string; code: string; personName: string | null; status: RsvpStatus | null;
};

export type TeamResponse = {
  teamId: string; teamName: string;
  confirmedPct: number; declinedPct: number; noReplyPct: number;
};

export type VolunteerLoad = {
  personId: string; initials: string; name: string;
  count: number; maxCount: number;   // maxCount = el mayor del grupo, para la escala
};

export type HomeProps = {
  greeting: string;            // "Hola, Claudia"
  todayLabel: string;          // "Sábado 19 de Septiembre · el próximo servicio es mañana"

  next: {
    whenLabel: string;         // "MAÑANA · 10:00"
    title: string;
    meta: string;
    calledCount: number; confirmedCount: number; uncoveredCount: number;
    pendingCount: number;
    onOpen: () => void;
    onRemind: () => void;
  } | null;

  calendar: { monthLabel: string; days: CalendarDay[]; onPrev: () => void; onNext: () => void };

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
  const cols = chunk(p.roster, Math.ceil(p.roster.length / 3) || 1);

  return (
    <>
      <h1 className="anc-hi">{p.greeting}</h1>
      <p className="anc-hiSub">{p.todayLabel}</p>

      {/* ── fila 1: próximo servicio + calendario ── */}
      <div className="anc-hGrid">
        {p.next && (
          <div className="anc-next">
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
          </div>
        )}

        <div className="anc-panel" style={{ padding: '14px 16px 16px' }}>
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
              <span
                key={i}
                className={[
                  'anc-day',
                  d.inMonth ? '' : 'anc-day--out',
                  d.hasService ? 'anc-day--svc' : '',
                  d.isToday ? 'anc-day--today' : '',
                ].filter(Boolean).join(' ')}
              >{d.label}</span>
            ))}
          </div>
          <div className="anc-calKey">
            <span><i /> Servicio o ensayo</span>
            <span><i className="anc-sq" /> Hoy</span>
          </div>
        </div>
      </div>

      {/* ── fila 2: atención + [próximos, cumpleaños] ── */}
      <div className="anc-hGrid">
        <div className="anc-panel">
          <div className="anc-cHead">
            <h2>Necesita atención</h2>
            <span className="anc-n">{p.attention.length} cosas</span>
          </div>
          <div className="anc-cBody">
            {p.attention.length === 0 ? (
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

        <div className="anc-hStack">
          <div className="anc-panel">
            <div className="anc-cHead">
              <h2>Próximos servicios</h2>
              <span className="anc-spacer" />
              <button className="anc-link">Ver todos</button>
            </div>
            <div className="anc-cBody" style={{ paddingTop: 8 }}>
              {p.upcoming.map((s) => (
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
              {p.birthdaysThisMonth.length === 0 ? (
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
      </div>

      {/* ── fila 3: nómina por equipo ── */}
      <div className="anc-panel" style={{ marginBottom: 16 }}>
        <div className="anc-hTabs" role="tablist">
          {p.teamTabs.map((t) => (
            <button key={t.id} role="tab" className="anc-hTab"
                    aria-selected={t.id === p.activeTeamId}
                    onClick={() => p.onTeamChange(t.id)}>
              {t.name} <span className="anc-c">{t.memberCount}</span>
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
                  <span className="anc-lb">{t.teamName}</span>
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

function dotClass(s: RsvpStatus) {
  return s === 'confirmed' ? 'ok' : s === 'declined' ? 'no' : 'pending';
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const CakeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 21h18M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M8 13V9M12 13V9M16 13V9" />
    <path d="M8 6.5c0-1 1-1.5 1-2.5 0 1 1 1.5 1 2.5M14 6.5c0-1 1-1.5 1-2.5 0 1 1 1.5 1 2.5" />
  </svg>
);
