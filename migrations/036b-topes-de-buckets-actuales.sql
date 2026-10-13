-- ============================================================
-- 036b — OPCIONAL: ponerles tope a los buckets actuales (punto 55, paso 4)
--
-- NO es parte de la 036: corrélo solo si querés. Hoy `song-attachments` (privado) no tiene límite de tamaño ni de tipos; hay UN adjunto
-- (1 PDF de 0,1 MB). Esto lo limita a 25 MB y a PDF e imágenes. Es una RESTRICCIÓN: no abre ningún permiso y no toca los archivos que
-- ya existen (solo afecta a lo que se suba de ahora en adelante). Consecuencia: ya no se podrá subir otro tipo de archivo (Word, ZIP...)
-- a ese bucket; la pantalla de administración lo avisa antes de subir (valida tipo y tamaño).
-- El audio NO va en este bucket: tiene el suyo (song-audio, migración 036).
-- `song-covers` (público, sin límites) se revisa en el punto 50 y no se toca acá.
-- ============================================================

update storage.buckets
   set file_size_limit = 26214400,   -- 25 MB
       allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
 where id = 'song-attachments';

-- ── Verificación: public = false, file_size_limit = 26214400 y los 7 tipos (1 fila)
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'song-attachments';

-- ── REVERTIR (vuelve a sin límite ni restricción de tipos)
-- update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'song-attachments';
