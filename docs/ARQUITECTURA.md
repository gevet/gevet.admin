# Arquitectura

GeVet usa Next.js App Router, React Server Components por defecto y Supabase PostgreSQL. Las tablas operativas llevan `tenant_id` y sus políticas comparan el valor con `auth.tenant_id()`, resuelto desde el JWT o desde la relación del usuario autenticado.

La interfaz se organiza en rutas públicas, onboarding y un shell administrativo responsive. El prototipo funcional usa almacenamiento local como modo de evaluación cuando Supabase no está configurado; la persistencia de producción corresponde a las tablas protegidas por RLS.

Los estilos de marca se expresan mediante propiedades CSS y deben reemplazarse en servidor con los valores de `tenant_branding`.
