# GeVet

Plataforma multi-tenant y configurable para la gestión cotidiana de clínicas veterinarias.

## Desarrollo local

1. Copiá `.env.example` a `.env.local` y completá las claves públicas de Supabase.
2. Instalá dependencias con `npm install`.
3. Ejecutá `npm run dev` y abrí `http://localhost:3000`.

## Verificaciones

- `npm run check`: valida el tipado estricto.
- `npm run check:brand`: comprueba el SVG oficial, rechaza contenido activo y verifica que la identidad esté conectada a las superficies principales.
- `npm run build`: genera la aplicación de producción.

La autenticación y los módulos operativos requieren Supabase configurado. Aplicá todas las migraciones antes de crear la primera cuenta: el trigger de Auth crea el tenant, branding y usuario en una única transacción.

## Seguridad

Las migraciones habilitan RLS en todas las tablas de negocio y resuelven el tenant desde el JWT; el cliente nunca suministra `tenant_id`. No se debe exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador.
