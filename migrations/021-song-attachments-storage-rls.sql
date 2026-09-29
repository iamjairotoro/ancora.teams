-- ============================================================
-- Fase 20 (cont.) — RLS del bucket privado "song-attachments"
--
-- El bucket ya se creó como privado en el dashboard de Supabase (fuera de
-- estas migraciones — Storage no se gestiona con SQL de creación de
-- bucket, solo con policies sobre storage.objects). Sin estas policies,
-- un bucket privado con RLS no deja pasar nada salvo al service role.
--
-- Regla:
-- - Lectura: cualquier miembro de la organización (el mismo criterio de
--   "estás en `members`" que ya usa el resto de la app — esta base es de
--   una sola organización, DEFAULT_ORGANIZATION_ID en lib/constants.ts).
-- - Subir/borrar: solo quien puede editar canciones. En esta app eso es
--   "admin de organización" — CancionesPanel.tsx solo se llega vía
--   /admin, que ya exige is_org_admin en la página. Se reusa la misma
--   función is_org_admin(email, organization_id) de migrations/002-teams.sql,
--   no se reimplementa.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real. El bucket privado tiene que existir ya en ambos proyectos
-- antes de correr esto (creación manual, un proyecto a la vez).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — lectura: cualquier miembro de la organización
-- ────────────────────────────────────────────────────────────

create policy "miembros leen adjuntos de canciones"
on storage.objects for select
using (
  bucket_id = 'song-attachments'
  and exists (
    select 1 from members m
    where lower(m.email) = lower(auth.jwt()->>'email')
      and m.organization_id = '00000000-0000-0000-0000-000000000001'
  )
);

-- ────────────────────────────────────────────────────────────
-- PASO 2 — subir/reemplazar/borrar: solo admins de organización
-- (insert cubre "subir"; update cubre el upsert:true que ya usa el
-- código si algún día reescribe el mismo path).
-- ────────────────────────────────────────────────────────────

create policy "admins suben adjuntos de canciones"
on storage.objects for insert
with check (
  bucket_id = 'song-attachments'
  and is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
);

create policy "admins reemplazan adjuntos de canciones"
on storage.objects for update
using (
  bucket_id = 'song-attachments'
  and is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
)
with check (
  bucket_id = 'song-attachments'
  and is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
);

create policy "admins borran adjuntos de canciones"
on storage.objects for delete
using (
  bucket_id = 'song-attachments'
  and is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
);

-- ── Verificación ──
-- Deben listar las 4 policies de arriba, todas con qual/with_check que
-- mencionan 'song-attachments'.
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like '%adjuntos de canciones%'
order by cmd;
