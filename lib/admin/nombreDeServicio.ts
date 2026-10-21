// El nombre corto de un servicio en las listas («Servicio Ancora», «Ensayo»). PURA.
import type { ServicioResumen } from '@/lib/admin/resumenServicios'

/** El nombre sin la fecha que `createService` le agrega después de « — »; sin título, «Ensayo» o «Servicio». */
export const nombreDeServicio = (s: Pick<ServicioResumen, 'titulo' | 'tipo'>): string => (s.titulo || '').split(' — ')[0].trim() || (s.tipo === 'ensayo' ? 'Ensayo' : 'Servicio')
