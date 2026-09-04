# Deploy

1. Crear un proyecto en Supabase y ejecutar, en orden, los archivos de `supabase/migrations`.
2. Ejecutar `scripts/verificar-rls.sql`; debe finalizar sin excepciones.
3. Configurar las URLs de autenticación y el claim `tenant_id` en Supabase Auth.
4. Importar el repositorio en Vercel y cargar las variables descriptas en `.env.example`.
5. Ejecutar `npm run build` antes de promover a producción.

La clave `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor y no debe usar el prefijo `NEXT_PUBLIC_`.

## Entorno productivo actual

- URL de la aplicación: `https://gevet-admin.vercel.app`.
- Site URL de Supabase Auth: `https://gevet-admin.vercel.app`.
- Redirect URLs de producción: `https://gevet-admin.vercel.app/auth/callback` y `https://gevet-admin.vercel.app/actualizar-clave`.
- Para desarrollo se conservan `http://localhost:3000/auth/callback` y `http://localhost:3000/actualizar-clave`.

Cada dominio o subdominio nuevo debe agregarse a la lista de redirects de Supabase antes de habilitar magic links o recuperación de contraseña en ese host.

## Instalación desde cero

Para un proyecto Supabase nuevo, `supabase/SETUP_COMPLETO.sql` reúne en un único script transaccional las extensiones, tablas base, entidades operativas principales, índices, RLS, alta atómica de tenants, Auth Hook y políticas de Storage. Después de ejecutarlo, activá `public.custom_access_token_hook` en **Authentication → Hooks → Custom Access Token** y corré `scripts/verificar-rls.sql`.
