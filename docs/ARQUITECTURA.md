# Arquitectura

GeVet usa Next.js App Router, React Server Components por defecto y Supabase PostgreSQL. Las tablas operativas llevan `tenant_id` y sus políticas comparan el valor con `auth.tenant_id()`, resuelto desde el JWT o desde la relación del usuario autenticado.

La interfaz se organiza en rutas públicas, onboarding y un shell administrativo responsive. Toda autenticación y persistencia operativa utiliza Supabase; si faltan variables de entorno, las rutas protegidas redirigen al acceso y muestran el error de configuración.

Los estilos de marca se expresan mediante propiedades CSS y deben reemplazarse en servidor con los valores de `tenant_branding`.

El layout administrativo consulta el tenant en el servidor, fuerza el onboarding cuando todavía está pendiente e inyecta nombre y colores en el shell. El dashboard también se renderiza en servidor y calcula sus indicadores mediante consultas acotadas por RLS.
