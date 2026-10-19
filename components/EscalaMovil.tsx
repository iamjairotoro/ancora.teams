// Etiqueta <style> con la escala del teléfono (el CSS y el factor viven en lib/escalaMovil.ts). La usan los layouts de /portal, /admin y /home.
import { cssEscala } from '@/lib/escalaMovil'

export default function EscalaMovil({ selectorCampos }: { selectorCampos: string }) {
  return <style dangerouslySetInnerHTML={{ __html: cssEscala(selectorCampos) }} />
}
