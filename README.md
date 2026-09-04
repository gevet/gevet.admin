# GeVet

Plataforma multi-tenant y configurable para la gestión cotidiana de clínicas veterinarias.

## Desarrollo local

1. Copiá `.env.example` a `.env.local` y completá las claves públicas de Supabase.
2. Instalá dependencias con `npm install`.
3. Ejecutá `npm run dev` y abrí `http://localhost:3000`.

La interfaz permite recorrer el onboarding, dashboard y módulos operativos aun sin credenciales de Supabase. En ese modo, los registros de la sesión se guardan localmente para facilitar la evaluación. Para producción se deben aplicar las migraciones y conectar las operaciones a Supabase.

## Seguridad

Las migraciones habilitan RLS en todas las tablas de negocio y resuelven el tenant desde el JWT; el cliente nunca suministra `tenant_id`. No se debe exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador.
