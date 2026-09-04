# Decisiones

1. Se reconstruyó primero un producto mínimo usable debido a la pérdida del árbol de trabajo anterior.
2. Se eliminó el modo `localStorage`: autenticación y datos operativos usan exclusivamente Supabase para no crear dos fuentes de verdad.
3. Los módulos operativos comparten un tablero reutilizable conectado a una tabla discriminada, con búsqueda, alta, baja lógica y exportación CSV.
4. Los nombres y contenidos son genéricos; no se incluye información perteneciente a una clínica real.
5. El onboarding persiste todos sus pasos en una única función PostgreSQL para evitar configuraciones parciales y no aceptar `tenant_id` desde el navegador.
