# Decisiones

1. Se reconstruyó primero un producto mínimo usable debido a la pérdida del árbol de trabajo anterior.
2. Se eliminó el modo `localStorage`: autenticación y datos operativos usan exclusivamente Supabase para no crear dos fuentes de verdad.
3. Los módulos operativos comparten un tablero reutilizable conectado a una tabla discriminada, con búsqueda, alta, baja lógica y exportación CSV.
4. Los nombres y contenidos son genéricos; no se incluye información perteneciente a una clínica real.

## Desarrollo frontend antes de Supabase

Mientras la infraestructura final de Supabase queda a cargo del despliegue, el catálogo de módulos vive en una única definición tipada y las rutas administrativas se generan desde ella. La persistencia sigue usando el contrato multi-tenant `gestion_registros`; la migración 004 amplía sus tipos de forma idempotente para que todas las áreas puedan conectarse sin aceptar `tenant_id` desde el cliente. Esta cobertura de navegación no reemplaza los modelos clínicos y comerciales normalizados que se incorporarán en migraciones futuras.
