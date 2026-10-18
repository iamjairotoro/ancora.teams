-- Diagnóstico del punto 50, parte B (SOLO LECTURA). Cuatro consultas para pegar directo en el SQL editor de Supabase; cada una ocupa UNA sola línea y no lleva comentarios dentro.
-- Qué es cada una (corrélas de a una y traé el resultado):
--   BLOQUE 14 — la definición REAL de las funciones que deciden quién es admin o líder (no contienen el secreto interno). Sirve para comprobar que en la base valen lo que dicen las migraciones 023, 036 y 027: que leen organization_members, team_members, teams y members.email.
--   BLOQUE 15 — con qué proveedor se registraron las cuentas de Supabase Auth (solo conteos). Si aparece «email» además de «google», alguien pudo registrarse con contraseña usando un correo que no es suyo, y ese correo es lo que comparan las funciones de rol. Revisá también en el panel (Authentication → Sign In / Providers) si «Allow new users to sign up» y el proveedor Email están como querés: eso no se ve con SQL.
--   BLOQUE 16 — cuántos correos están repetidos en members. Esperado: 0. El login trata un correo repetido como «ambiguo» y bloquea a esa persona.
--   BLOQUE 17 — cuántos administradores u owners no tienen filas en team_admins ni en team_members. organization_members borra en cascada con la persona; team_admins y team_members lo impiden. Esa persona se podría borrar con la clave pública (y perdería su rol). Solo cuenta, no lista a nadie. Esperado: 0.

select p.proname as funcion, pg_get_functiondef(p.oid) as definicion from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('is_org_admin', 'is_org_owner', 'is_team_admin', 'is_team_leader', 'is_any_team_leader', 'has_library_access', 'can_manage_library_files', 'storage_path_org', 'guard_members_email_change') order by p.proname;

select coalesce(raw_app_meta_data->>'provider', '(sin proveedor)') as proveedor, count(*) as cuentas from auth.users group by 1 order by 2 desc;

select count(*) as correos_repetidos from (select lower(btrim(email)) from members where email is not null and btrim(email) <> '' group by 1 having count(*) > 1) x;

select count(*) as con_rol_sin_proteccion from organization_members om where om.role in ('owner', 'admin') and not exists (select 1 from team_admins ta where ta.member_id = om.person_id) and not exists (select 1 from team_members tm where tm.member_id = om.person_id);
