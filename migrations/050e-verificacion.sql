select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename in ('banda_assignments','team_positions') order by tablename, policyname;

select (select count(*) from public.banda_assignments) as banda_total, (select count(*) from public.team_positions) as posiciones_total, (select count(*) from public.services where organization_id is null) as servicios_sin_organizacion;

do $$ begin set local role anon; perform count(*) from public.banda_assignments; raise exception 'FALLO: anon pudo leer banda_assignments'; end $$;

do $$ begin set local role anon; perform count(*) from public.team_positions; raise exception 'FALLO: anon pudo leer team_positions'; end $$;

do $$ declare b int; p int; u int; begin set local role authenticated; perform set_config('request.jwt.claims', json_build_object('email', 'CORREO_DE_UN_ADMIN', 'role', 'authenticated')::text, true); select count(*) into b from public.banda_assignments; select count(*) into p from public.team_positions; update public.banda_assignments set slot_index = slot_index where id = (select id from public.banda_assignments limit 1); get diagnostics u = row_count; raise exception 'ADMIN: banda_visible=% posiciones_visibles=% filas_que_puede_escribir=% (esperado: todas, todas, 1)', b, p, u; end $$;

do $$ declare b int; p int; u int; begin set local role authenticated; perform set_config('request.jwt.claims', json_build_object('email', 'CORREO_DE_UN_LIDER', 'role', 'authenticated')::text, true); select count(*) into b from public.banda_assignments; select count(*) into p from public.team_positions; update public.banda_assignments set slot_index = slot_index where id = (select id from public.banda_assignments limit 1); get diagnostics u = row_count; raise exception 'LIDER: banda_visible=% posiciones_visibles=% filas_que_puede_escribir=% (esperado: todas, todas, 0)', b, p, u; end $$;

do $$ declare b int; p int; begin set local role authenticated; perform set_config('request.jwt.claims', json_build_object('email', 'CORREO_DE_UNA_PERSONA_QUE_NO_ES_ADMIN_NI_LIDER', 'role', 'authenticated')::text, true); select count(*) into b from public.banda_assignments; select count(*) into p from public.team_positions; raise exception 'SIN ROL: banda_visible=% posiciones_visibles=% (esperado: 0, 0)', b, p; end $$;
