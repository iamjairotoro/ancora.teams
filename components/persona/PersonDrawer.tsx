/* ════════════════════════════════════════════════════════════════════════
   PersonDrawer.tsx — panel lateral de persona, global.
   ORIGEN: docs/mockup-panel-persona.html.

   ARQUITECTURA — esto es lo importante:
   El panel se monta UNA sola vez, dentro de <AppShell>. Cualquier fila de
   cualquier pantalla lo abre con el hook:

       const { open } = usePersonDrawer();
       <button onClick={() => open(person.id)}>…</button>

   NO montar un <PersonDrawer> por lista. Si cada pantalla monta el suyo,
   quedan varios en el DOM con estados que se pisan y el scroll-lock se
   descuadra.

   El componente NO consulta Supabase: recibe `loadPerson` desde arriba y
   carga al abrir (lazy). Así no se traen 24 historiales para mostrar uno.
   ════════════════════════════════════════════════════════════════════════ */

'use client';

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { X } from 'lucide-react';

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

export type PersonDetail = {
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

/* ── contexto ── */

/* edit: pedir "editar a esta persona" desde cualquier pantalla (el dueño de
   la pantalla decide cómo: hoy abre el pop-up de edición). No hace nada si
   quien mira no puede editar (canEdit). */
type Ctx = { open: (personId: string) => void; close: () => void; edit: (personId: string) => void };
const PersonDrawerCtx = createContext<Ctx | null>(null);

export function usePersonDrawer(): Ctx {
  const ctx = useContext(PersonDrawerCtx);
  if (!ctx) throw new Error('usePersonDrawer debe usarse dentro de <PersonDrawerProvider>');
  return ctx;
}

export type PersonDrawerProviderProps = {
  loadPerson: (personId: string) => Promise<PersonDetail>;
  canEdit: boolean;
  onEdit?: (personId: string) => void;
  onAssign?: (personId: string) => void;
  onMenu?: (personId: string) => void;
  children: React.ReactNode;
};

export function PersonDrawerProvider({
  loadPerson, canEdit, onEdit, onAssign, onMenu, children,
}: PersonDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  /* Qué ficha está abierta y cuál es la última petición válida: si llegan
     dos respuestas fuera de orden (abrir A y enseguida B, o una recarga
     mientras otra sigue en vuelo), solo vale la más nueva. */
  const currentId = useRef<string | null>(null);
  const reqSeq = useRef(0);

  const open = useCallback(async (personId: string) => {
    /* a quién devolverle el foco al cerrar: si no se guarda, el teclado
       queda al principio de la página */
    returnTo.current = document.activeElement as HTMLElement;
    const seq = ++reqSeq.current;
    currentId.current = personId;
    setIsOpen(true);
    setLoading(true);
    setPerson(null);
    try {
      const p = await loadPerson(personId);
      if (seq === reqSeq.current) setPerson(p);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [loadPerson]);

  /* Los datos de la persona salen de listas que mantiene la página
     (personas, equipos, posiciones). Cuando esas listas se recargan —tras
     editar a alguien o cambiarlo de equipo— loadPerson cambia de identidad:
     si hay una ficha abierta se vuelve a pedir EN SILENCIO (sin vaciarla, sin
     cartel de "Cargando…", sin cerrarla ni mover el foco), así que no
     muestra datos viejos ni pierde el lugar. */
  useEffect(() => {
    if (!isOpen || !currentId.current) return;
    const seq = ++reqSeq.current;
    loadPerson(currentId.current)
      .then((p) => { if (seq === reqSeq.current) { setPerson(p); setLoading(false); } })
      .catch(() => { if (seq === reqSeq.current) setLoading(false); /* se queda con lo que ya mostraba */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPerson]);

  const close = useCallback(() => {
    setIsOpen(false);
    returnTo.current?.focus();
  }, []);

  const edit = useCallback((personId: string) => {
    if (canEdit) onEdit?.(personId);
  }, [canEdit, onEdit]);

  /* Escape cierra */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  /* el fondo no debe hacer scroll mientras el panel está abierto */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /* el foco entra al panel al abrirse */
  useEffect(() => { if (isOpen) closeBtn.current?.focus(); }, [isOpen]);

  return (
    <PersonDrawerCtx.Provider value={{ open, close, edit }}>
      {children}

      <div className="anc-scrim" data-open={isOpen} onClick={close} aria-hidden />

      <aside
        className="anc-drawer"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={person ? `Ficha de ${person.fullName}` : 'Ficha de persona'}
      >
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
            <button ref={closeBtn} className="anc-dClose" onClick={close} aria-label="Cerrar">
              <X size={15} />
            </button>
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
      </aside>
    </PersonDrawerCtx.Provider>
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
