-- Habilita Supabase Realtime para la tabla `messages`.
-- Sin esto, los INSERT nuevos no se transmiten por WebSocket a los
-- clientes suscritos — por eso el chat no se actualizaba en vivo
-- (los mensajes SÍ se guardaban bien, solo no se avisaba a los demás).
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar.

alter publication supabase_realtime add table messages;

-- Verificación rápida: esta consulta debe devolver una fila con "messages"
-- select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages';
