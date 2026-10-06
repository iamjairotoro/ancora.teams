'use client';
/* Carga de la ficha de una persona, compartida por el cajón y el panel fijo.

   loadPerson viene de arriba (el que arma /admin o /home): este hook no
   consulta Supabase por su cuenta.

   - load(id): pide la ficha. Solo vale la ÚLTIMA petición: si llegan dos
     respuestas fuera de orden (A y enseguida B, o una recarga mientras otra
     sigue en vuelo), se descartan las viejas.
   - Sin opciones, vacía la ficha y muestra «Cargando…» (el cajón).
   - { keepPrevious: true } mantiene el contenido anterior hasta que llegue el
     nuevo, y «Cargando…» solo aparece en la primera carga (el panel fijo).
   - { delayMs } espera antes de pedir (para ↑/↓ seguidos); un load nuevo
     cancela el que estaba esperando.
   - Cuando loadPerson cambia de identidad —las listas de la página se
     recargaron tras editar a alguien o cambiarlo de equipo— y hay una ficha
     pedida, se vuelve a pedir EN SILENCIO: sin vaciarla ni mostrar «Cargando…».
   - stop(): deja de seguir esa ficha (no la vacía: el cajón la sigue mostrando
     mientras se desliza al cerrarse). */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PersonDetailData } from './PersonDetail';

export type LoadPersonOptions = { delayMs?: number; keepPrevious?: boolean };

export function usePersonDetail(loadPerson: (personId: string) => Promise<PersonDetailData>) {
  const [person, setPersonState] = useState<PersonDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const personRef = useRef<PersonDetailData | null>(null);
  const currentId = useRef<string | null>(null);
  const reqSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPerson = useCallback((p: PersonDetailData | null) => {
    personRef.current = p;
    setPersonState(p);
  }, []);
  const clearTimer = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const load = useCallback(async (personId: string, opts?: LoadPersonOptions) => {
    clearTimer();
    const seq = ++reqSeq.current;
    currentId.current = personId;
    if (!opts?.keepPrevious) setPerson(null);
    if (!opts?.keepPrevious || personRef.current === null) setLoading(true);

    const run = async () => {
      try {
        const p = await loadPerson(personId);
        if (seq === reqSeq.current) setPerson(p);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    };
    if (opts?.delayMs) { timer.current = setTimeout(() => { timer.current = null; void run(); }, opts.delayMs); return; }
    await run();
  }, [loadPerson, clearTimer, setPerson]);

  useEffect(() => {
    const id = currentId.current;
    if (!id) return;
    clearTimer();
    const seq = ++reqSeq.current;
    loadPerson(id)
      .then((p) => { if (seq === reqSeq.current) { setPerson(p); setLoading(false); } })
      .catch(() => { if (seq === reqSeq.current) setLoading(false); /* se queda con lo que ya mostraba */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPerson]);

  const stop = useCallback(() => {
    clearTimer();
    reqSeq.current++;
    currentId.current = null;
    setLoading(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { person, loading, load, stop };
}
