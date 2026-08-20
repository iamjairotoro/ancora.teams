# 🎵 Ancora Teams — Guía de instalación completa

## ¿Qué hace esta app?

- Armas el setlist de cada domingo (canciones, banda, voces)
- Envías invitaciones por correo a cada músico asignado
- Cada músico recibe un email con botones **Confirmo / No puedo**
- Ves en tiempo real quién confirmó y sus comentarios
- Base de datos de músicos y canciones

---

## PASO 1 — Configurar Supabase (base de datos)

1. Ve a **supabase.com** → inicia sesión → **New project**
2. Ponle nombre: `ancora-setlist`, elige una contraseña y región (ej. South America)
3. Espera ~2 minutos a que se cree
4. Ve a **SQL Editor** (menú izquierdo) → **New query**
5. Copia y pega TODO el contenido del archivo `supabase-schema.sql` → clic en **Run**
6. Ve a **Project Settings** (ícono de tuerca) → **API**
7. Anota estos dos valores:
   - **Project URL** → `https://XXXXX.supabase.co`
   - **anon public key** → `eyJhbGci...`

---

## PASO 2 — Configurar Resend (correos)

1. Ve a **resend.com** → inicia sesión
2. En el menú: **API Keys** → **Create API Key**
3. Nómbrala `ancora` → clic en **Create** → copia la clave (`re_XXXXXXX`)
4. Ve a **Domains** → si tienes dominio propio agrégalo y verifica
5. Si no tienes dominio: puedes usar `onboarding@resend.dev` temporalmente para pruebas

---

## PASO 3 — Subir el código a GitHub

1. Ve a **github.com** → inicia sesión (o crea cuenta gratis)
2. Clic en **+** → **New repository** → nombre: `ancora-setlist` → **Create repository**
3. Descarga e instala **GitHub Desktop** desde desktop.github.com
4. En GitHub Desktop: **Add existing repository** → selecciona la carpeta `ancora-app`
5. Clic en **Publish repository** → asegúrate que sea **Private** → **Publish**

---

## PASO 4 — Desplegar en Vercel

1. Ve a **vercel.com** → inicia sesión con GitHub
2. Clic en **Add New Project** → selecciona el repo `ancora-setlist`
3. Antes de hacer deploy, clic en **Environment Variables** y agrega estas 5 variables:

| Nombre | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` (del paso 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (del paso 1) |
| `RESEND_API_KEY` | `re_XXXXXXX` (del paso 2) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (o tu email verificado) |
| `NEXT_PUBLIC_APP_URL` | `https://ancora-setlist.vercel.app` (tu URL de Vercel) |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | La contraseña que quieras para entrar al admin |

4. Clic en **Deploy** → espera ~2 minutos

¡Listo! Tu app estará en `https://ancora-setlist.vercel.app`

---

## PASO 5 — Primera configuración

1. Entra a tu app → escribe la contraseña admin
2. Ve a **👥 Equipo** → agrega a cada músico con su email e instrumentos
3. Ve a **🎶 Canciones** → agrega las canciones con sus links
4. Ve a **🎵 Setlist** → crea un nuevo servicio → asigna banda/voces → arma el setlist
5. Clic en **Enviar invitaciones** → cada músico recibirá su correo

---

## Flujo semanal (ya con la app funcionando)

1. Crea un nuevo servicio (botón "+ Nuevo servicio")
2. Asigna músicos a cada posición
3. Agrega las canciones del setlist
4. Clic en **Enviar invitaciones**
5. Ves las confirmaciones en tiempo real en la misma pantalla

---

## Costos

| Servicio | Plan gratuito |
|----------|--------------|
| Supabase | Hasta 500MB de datos, 50,000 filas — más que suficiente |
| Resend   | 100 emails/día, 3,000/mes — perfecto para un equipo |
| Vercel   | Proyectos ilimitados en plan gratuito |
| **Total** | **$0 USD/mes** |

Si en el futuro quisieras un dominio propio (ej. `setlist.ancora.cl`): ~$12 USD/año

---

## Preguntas frecuentes

**¿Cómo cambio la contraseña del admin?**
En Vercel → tu proyecto → Settings → Environment Variables → edita `NEXT_PUBLIC_ADMIN_PASSWORD` → Redeploy

**¿Qué pasa si un músico no tiene email?**
Simplemente no recibirá invitación. Puedes agregarle el email después editándolo en la pestaña Equipo.

**¿Puedo usar la app desde el celular?**
Sí, está diseñada para funcionar bien en móvil tanto para el admin como para los músicos que responden.

**¿Los músicos necesitan crear cuenta?**
No. Reciben un link único en su correo y con un clic responden. Sin registro, sin contraseña.
