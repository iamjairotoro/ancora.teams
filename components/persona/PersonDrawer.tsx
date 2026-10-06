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
import PersonDetailView, { type PersonDetailData } from './PersonDetail';
import { usePersonDetail } from './usePersonDetail';

/* Los tipos de la ficha viven en PersonDetail.tsx; se reexportan acá con los
   nombres de siempre para que ningún import existente cambie. */
export type { ServiceHistoryEntry, PersonTeam, PersonDetailData as PersonDetail } from './PersonDetail';

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
  loadPerson: (personId: string) => Promise<PersonDetailData>;
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
  const returnTo = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  /* La ficha, su estado de carga, la guarda contra respuestas desordenadas y
     la recarga en silencio cuando las listas de la página cambian
     (loadPerson cambia de identidad): todo eso vive en usePersonDetail. */
  const { person, loading, load, stop } = usePersonDetail(loadPerson);

  const open = useCallback((personId: string) => {
    /* a quién devolverle el foco al cerrar: si no se guarda, el teclado
       queda al principio de la página */
    returnTo.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    void load(personId);
  }, [load]);

  const close = useCallback(() => {
    setIsOpen(false);
    stop();
    returnTo.current?.focus();
  }, [stop]);

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
        <PersonDetailView
          person={person}
          loading={loading}
          canEdit={canEdit}
          onEdit={onEdit}
          onAssign={onAssign}
          onMenu={onMenu}
          headerAction={
            <button ref={closeBtn} className="anc-dClose" onClick={close} aria-label="Cerrar">
              <X size={15} />
            </button>
          }
        />
      </aside>
    </PersonDrawerCtx.Provider>
  );
}
