# Auditoría de Estado de GeVet

**Fecha:** 2026-09-04  
**Rama:** `claude/gevet-saas-multitenant-aph8vm`  
**Commit:** eaca20c (Merge pull request #7 from gevet/feat/auth-completa)

## Resumen Ejecutivo

GeVet es un scaffolding de SaaS veterinario multi-tenant con infraestructura de seguridad básica pero **sin implementación de dominio real**. El catálogo de módulos es extenso (55 pantallas), pero todas usan un componente genérico `RecordsBoard` conectado a una tabla discriminada `gestion_registros(tipo, detalle jsonb)`. 

**Estado:** No listo para producción. Requiere normalización de base de datos, tipado de dominio, validación server-side, paginación, tests y completitud de flujos críticos.

---

## A. Funcionalidades Reales ✓

### A.1 Autenticación y Sesiones
- ✓ Registro de usuarios via email + contraseña
- ✓ Login email + contraseña
- ✓ Recuperación de contraseña con magic link
- ✓ Sesión persistida en cookies (Supabase SSR)
- ✓ Logout en dispositivo actual
- ✓ Logout global (actualización de `session_last_seen`)
- ✓ Middleware de protección de rutas (`/admin/*`, `/onboarding`, `/actualizar-clave`)
- ✓ Callback de auth seguro con `retorno` en query string
- ✓ Manejo de errores de configuración

### A.2 Multi-tenancy
- ✓ Creación automática de tenant al registrarse
- ✓ Función `public.tenant_id()` (SECURITY DEFINER, estable)
- ✓ RLS en todas las tablas operativas (tenants, usuarios, registros, etc.)
- ✓ Aislamiento de datos por tenant_id
- ✓ Slug único generado automáticamente
- ✓ Contexto forzado en triggers (no se puede enviar tenant_id desde cliente)

### A.3 Autorización Básica
- ✓ Rol de "Dueño" creado automáticamente
- ✓ Permiso global `'*'` para propietarios
- ✓ Función `public.tiene_permiso(text)`
- ✓ Estructura de roles, permisos y asignaciones multi-tenant
- ✓ Tabla de auditoría (gestion_auditoria)

### A.4 Branding White-label
- ✓ Tabla `tenant_branding` con colores, logos, tipografía, favicon
- ✓ Validación de SVG (no scripts, no event handlers)
- ✓ Verificación de referencias a GEVET.svg en superficies principales
- ✓ Script `npm run check:brand`

### A.5 Infraestructura de Datos
- ✓ Migraciones versionadas (001-004)
- ✓ SETUP_COMPLETO.sql para instalación desde cero
- ✓ Tablas base: tenants, gestion_usuarios, gestion_roles, gestion_permisos
- ✓ Tablas operativas simuladas: gestion_clientes, gestion_mascotas, gestion_turnos, gestion_consultas, gestion_items, gestion_caja_sesiones
- ✓ Buckets de Storage multi-tenant (logos, mascotas, estudios, documentos, firmas)
- ✓ Auth Hook para inyectar tenant_id en JWT
- ✓ Índices por tenant y columnas frecuentes
- ✓ Triggers de contexto y fecha de modificación

### A.6 UI Base
- ✓ Componentes: Button, Card, Input, Modal, EmptyState, Badge
- ✓ Sidebar colapsable en desktop, menú hamburguesa en móvil
- ✓ Tema claro/oscuro via Tailwind
- ✓ Responsive 360px+
- ✓ Navegación generada desde módulos
- ✓ Logo y marca en header

### A.7 Módulos (Navegación)
- ✓ Catálogo centralizado de 55 módulos (catalog.ts)
- ✓ Generación estática de rutas desde `generateStaticParams`
- ✓ Agrupación por categorías (Clínica, Agenda, Comercial, etc.)
- ✓ Iconos y descripciones

---

## B. Funcionalidades Simuladas (No Implementadas) ✗

### B.1 Gestión de Clientes
- ✗ Estructura de datos normalizada (especie, raza, edad, condiciones, etc.)
- ✗ Búsqueda full-text en base de datos
- ✗ Paginación server-side
- ✗ Formularios con validación Zod
- ✗ Vista de detalle con historial
- ✗ Edición de datos
- ✗ Campos específicos (DNI/CUIT, dirección, contactos secundarios)
- ✗ Cuenta corriente
- ✗ Historial de pagos

### B.2 Gestión de Mascotas
- ✗ Relación cliente → mascotas normalizada
- ✗ Vacunas
- ✗ Peso e histórico
- ✗ Alergias y condiciones preexistentes
- ✗ Timeline clínico
- ✗ Fotos y documentos

### B.3 Agenda y Turnos
- ✗ Calendario real (día/semana/mes)
- ✗ Drag & drop
- ✗ Estados de turno (pendiente, confirmado, en curso, atendido, ausente, cancelado)
- ✗ Check-in
- ✗ Sala de espera en vivo
- ✗ Disponibilidad y horarios
- ✗ Duración configurable por servicio

### B.4 Consulta Clínica
- ✗ Anamnesis estructurada
- ✗ Examen físico (temperatura, FC, FR, TLLC, mucosas, peso)
- ✗ Diagnóstico presuntivo y definitivo
- ✗ Tratamiento e indicaciones
- ✗ SOAP
- ✗ Próxima visita sugerida
- ✗ Problemas crónicos

### B.5 Receta y Prescripción
- ✗ Generación de PDF con datos de veterinario, clínica y recomendaciones
- ✗ Medicamentos con dosis por kg
- ✗ Control de medicamentos que requieren receta
- ✗ Historial de prescripciones

### B.6 Comercial
- ✗ Productos y servicios con código, barras, costo, margen, IVA
- ✗ Stock por sucursal
- ✗ Lotes y vencimientos (FEFO)
- ✗ Proveedores y órdenes de compra
- ✗ Remitos y facturas de compra

### B.7 POS y Caja
- ✗ Búsqueda instantánea de productos
- ✗ Lectura de código de barras
- ✗ Carrito de compra
- ✗ Descuentos autorizados
- ✗ Cobro mixto (efectivo, tarjeta, cuenta corriente)
- ✗ Pagos parciales
- ✗ Comprobantes con numeración por punto de venta
- ✗ Apertura y cierre de caja
- ✗ Arqueo de diferencias
- ✗ Idempotencia transaccional

### B.8 Reportes
- ✗ Reporte diario operativo (ventas, caja, actividad clínica)
- ✗ Exportación Excel y PDF
- ✗ Filtros por fecha, sucursal, veterinario
- ✗ Vistas materializadas para KPIs
- ✗ Reportes programados

### B.9 Onboarding
- ✗ Wizard persistente (datos, identidad, sucursales, equipo, servicios, módulos)
- ✗ Upload de logo
- ✗ Preview en vivo
- ✗ Invitación real de usuarios
- ✗ Importación CSV/Excel de clientes y mascotas
- ✗ Validación por fila
- ✗ Procesamiento por lotes
- ✗ Estado `onboarding_completado` solo al finalizar

### B.10 Portal del Cliente
- ✗ `/[slug]/portal` con resolución segura del tenant
- ✗ Branding dinámico del cliente
- ✗ Mascotas y turnos del dueño
- ✗ Historia clínica resumida
- ✗ Reserva online

---

## C. Problemas Técnicos y Deuda

### C.1 Base de Datos
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| `gestion_registros(tipo, detalle jsonb)` anti-pattern | Imposible indexar, filtrar, validar datos de dominio | **CRÍTICO** |
| Migraciones 001-003 incompletas, mayía en SETUP_COMPLETO.sql | No hay versionamiento, no es reproducible | **CRÍTICO** |
| No hay FK multi-tenant en relaciones (ej: mascota → cliente) | Posible relacionar datos de diferentes tenants | **CRÍTICO** |
| Falta índice en `gestion_registros(tenant_id, nombre trgm)` | Búsqueda lenta | **ALTO** |
| Auditoría no registra cambios de gestion_registros | No hay trazabilidad | **ALTO** |
| Storage privado sin URLs firmadas | Exposición de datos | **ALTO** |
| No hay validación de acceso a Storage por tenant | Data leakage | **CRÍTICO** |

### C.2 Autenticación y Autorización
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| Sin rate limiting en login, registro, recuperación | Ataque de fuerza bruta | **ALTO** |
| Sin invitación de usuarios | Imposible onboarding de equipo | **ALTO** |
| Sin roles de sucursal | Todos tienen acceso a todo | **ALTO** |
| Sin verificación de estado del tenant (trial vencido, suspendido) | Trial vencido sigue accediendo | **ALTO** |
| Sin verificación de onboarding_completado en middleware | Puede skipearse | **MEDIO** |

### C.3 API y Validación
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| RecordsBoard sin validación Zod | JSONB sin estructura, vulnerabilidades | **CRÍTICO** |
| Sin server actions para RecordsBoard | Inseguro, sin rate limiting | **CRÍTICO** |
| Sin route handlers explícitos | Validación difícil de aplicar | **CRÍTICO** |
| Sin paginación en consultas | Carga toda la tabla en memoria | **ALTO** |
| Búsqueda en cliente (1000+ filas) | N+1 en Red, UX lenta | **ALTO** |
| Sin deduplicación de envíos (idempotency keys) | Transacciones duplicadas en POS | **CRÍTICO** |

### C.4 Frontend
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| RecordsBoard es un único cliente component de 58 líneas | No es mantenible | **ALTO** |
| Sin componentes reutilizables (Input, Select, DatePicker, etc.) | Duplicación de código | **MEDIO** |
| Sin formularios tipo de validación Zod | Inconsistencia | **MEDIO** |
| Sin breadcrumbs en navegación profunda | Desorientación | **BAJO** |
| Sin carga de estado (skeleton) en listados | UX pobre | **BAJO** |

### C.5 Configuración y DevOps
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| Sin ESLint | No hay lint en CI/CD | **MEDIO** |
| Sin tests unitarios/integración/E2E | No hay garantía de calidad | **CRÍTICO** |
| Sin verificación de migraciones en CI/CD | Despliegues inseguros | **ALTO** |
| Sin auditoría de secretos en CI/CD | Posible leak de credenciales | **ALTO** |
| Sin GitHub Actions workflows | Deploy manual | **MEDIO** |

### C.6 Documentación
| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| MANUAL_USUARIO describe funcionalidad no implementada | Confusión | **BAJO** |
| Sin guía de contribución | Inconsistencia en PRs | **BAJO** |
| Sin runbook de rollback | Recuperación lenta ante incidentes | **MEDIO** |

---

## D. Riesgos de Seguridad

### D.1 Multi-tenancy (Crítico)
**Riesgo:** Relacionar datos entre tenants via FK simple.  
**Ejemplo:** Mascota del Tenant A con cliente del Tenant B.  
**Mitigación:** Agregar constraint compuesto (tenant_id, id) o trigger defensivo.  
**Prioridad:** CRÍTICO

### D.2 Validación (Crítico)
**Riesgo:** Aceptar JSONB sin estructura desde cliente.  
**Ejemplo:** RecordsBoard permite guardar cualquier JSON en `detalle`.  
**Mitigación:** Validación Zod en server actions y route handlers.  
**Prioridad:** CRÍTICO

### D.3 Autorización (Alto)
**Riesgo:** Verificación solo en middleware, no en operaciones específicas.  
**Ejemplo:** `clientes.eliminar` definido pero no verificado.  
**Mitigación:** Server actions con `tiene_permiso()`.  
**Prioridad:** ALTO

### D.4 Rate Limiting (Alto)
**Riesgo:** Sin límites en login, registro, recuperación.  
**Mitigación:** Redis + middleware o package type-safe.  
**Prioridad:** ALTO

### D.5 Storage (Crítico)
**Riesgo:** URLs de Storage sin firmar, sin validación de acceso.  
**Ejemplo:** `mascotas/tenant-a/foto.jpg` accesible como raw desde el navegador.  
**Mitigación:** URLs firmadas + RLS en storage.objects (ya configurado).  
**Prioridad:** CRÍTICO

### D.6 Enumeración (Medio)
**Riesgo:** Errores específicos al registrarse ("Email ya existe").  
**Mitigación:** Errores genéricos.  
**Prioridad:** MEDIO

---

## E. Deuda de Base de Datos

### E.1 Estructura Actual
```
gestion_registros(
  id uuid pk,
  tenant_id uuid fk → tenants.id,
  tipo enum(cliente, mascota, turno, ...),
  nombre text,
  detalle jsonb,  ← ANTI-PATTERN
  creado_por uuid fk → auth.users.id,
  creado_en timestamptz,
  actualizado_en timestamptz,
  activo boolean
)
```

**Problemas:**
- No hay FK a gestion_clientes, gestion_mascotas, etc.
- `detalle` sin esquema, sin validación
- Índice solo en (tenant_id, tipo, creado_en)
- Imposible full-text search
- Imposible relaciones normalizadas

### E.2 Estructura Objetivo

```
gestion_clientes (normalizada)
├── id, tenant_id, nombre, apellido, dni_cuit, email, telefonos[], dirección, ...
├── saldo_cuenta_corriente, puntos_fidelización
├── creado_en, actualizado_en, activo
└── RLS + índices

gestion_mascotas (normalizada)
├── id, tenant_id, cliente_id (FK + constraint multi-tenant)
├── nombre, especie, raza, sexo, peso, microchip, castrado
├── alergias, condiciones_preexistentes
└── RLS + índices

gestion_turnos (normalizada)
├── id, tenant_id, mascota_id, cliente_id, veterinario_id, sucursal_id
├── servicio, inicio, fin, estado, notas
└── RLS + índices + check(fin > inicio)

gestion_consultas (normalizada)
├── id, tenant_id, mascota_id, veterinario_id, sucursal_id
├── fecha, motivo, anamnesis, examen_fisico{}, diagnóstico_*, tratamiento, indicaciones
└── RLS + índices

gestion_registros (limitado a auditoría)
└── Redirigir a gestion_auditoria inmutable
```

### E.3 Plan de Migración

1. Crear migración 005: normalizar `gestion_clientes` (ya existe, pero mejorar)
2. Crear migración 006: normalizar `gestion_mascotas` con FK multi-tenant
3. Crear migración 007: normalizar `gestion_turnos`
4. Crear migración 008: normalizar `gestion_consultas`
5. Crear migración 009: normalizar `gestion_items`, `gestion_stock`
6. Crear migración 010: mejorar `gestion_caja_sesiones` y `gestion_movimientos_caja`
7. Crear migración 011: deprecar `gestion_registros` (convertir a historial)
8. Data migration scripts (con validación)

---

## F. Arquitectura Actual

```
┌─ Next.js 15 (App Router, RSC)
├─ React 19
├─ Tailwind CSS v4
├─ Supabase (Auth + PostgreSQL + Storage + RLS)
├─ Zod (instalado pero no usado)
├─ lucide-react (iconos)
├─ date-fns (fechas)
└─ @supabase/ssr (middleware SSR)

Rutas:
  / → Login si no auth, admin/dashboard si auth
  /login → Auth form
  /registro → Signup con nombre comercial
  /recuperar-clave → Magic link
  /actualizar-clave → Cambio de contraseña
  /onboarding → Wizard simulado
  /admin/dashboard → Index vacío
  /admin/[...modulo] → RecordsBoard genérico

Middleware:
  `/admin/*` → require auth
  `/onboarding` → require auth
  `/actualizar-clave` → require auth (callback de password reset)

Storage:
  Privado: logos, mascotas, estudios, documentos, firmas
  Rutas: `{bucket_id}/{tenant_id}/{archivo}`
```

---

## G. Criterios de Terminado por Fase

### Fase 1: Auditoría y Setup (ACTUAL)
- [x] Auditar estado actual
- [x] Documentar en AUDITORIA_ESTADO.md
- [ ] Corregir vulnerabilidades de npm
- [ ] Agregar ESLint
- [ ] Agregar Vitest
- [ ] Versionar tipos TypeScript
- [ ] Crear GitHub Actions

### Fase 2: Autenticación Completa
- [ ] Registración con validación Zod
- [ ] Login con rate limiting
- [ ] Recuperación con rate limiting
- [ ] Logout global e en dispositivo
- [ ] Invitación de usuarios (email)
- [ ] Aceptación de invitaciones
- [ ] Onboarding persistente (wizard)
- [ ] Trial vencido / suspendido bloqueado
- [ ] Email verificado (si requiere)

### Fase 3: Base de Datos Normalizada
- [ ] Migración 005: Mejorar gestion_clientes
- [ ] Migración 006: gestion_mascotas con FK multi-tenant
- [ ] Migración 007: gestion_turnos normalizado
- [ ] Migración 008: gestion_consultas normalizado
- [ ] Migración 009: gestion_items y gestion_stock
- [ ] Migración 010: gestion_movimientos_caja
- [ ] Validación RLS en CI/CD
- [ ] Tests de aislamiento multi-tenant
- [ ] Tipos TypeScript auto-generados

### Fase 4: Clientes
- [ ] Listado server-side con paginación
- [ ] Búsqueda full-text en BD
- [ ] Crear cliente (formulario + validación)
- [ ] Detalle de cliente
- [ ] Editar cliente
- [ ] Borrado lógico
- [ ] Exportación Excel/PDF
- [ ] Cuenta corriente (saldo)
- [ ] Historial de transacciones
- [ ] Mobile responsive 360px

### Fase 5: Mascotas
- [ ] Listado con paginación
- [ ] Crear mascota (asociada a cliente)
- [ ] Detalle y edición
- [ ] Timeline clínico
- [ ] Vacunas
- [ ] Peso e histórico
- [ ] Fotos y documentos
- [ ] Borrado lógico
- [ ] Exportación

### Fase 6: Agenda
- [ ] Calendario (día/semana/mes)
- [ ] Crear turno (mascota, cliente, veterinario, sucursal)
- [ ] Editar turno
- [ ] Drag & drop
- [ ] Estados de turno
- [ ] Check-in
- [ ] Confirmación
- [ ] Cancelación
- [ ] Reminders

### Fase 7: Consulta Clínica
- [ ] Crear consulta (post-check-in)
- [ ] Anamnesis estructurada
- [ ] Examen físico (campos específicos)
- [ ] Diagnósticos
- [ ] Tratamiento e indicaciones
- [ ] SOAP
- [ ] Próxima visita
- [ ] Prescripciones
- [ ] Receta PDF

### Fase 8: POS y Caja
- [ ] Búsqueda de productos
- [ ] Código de barras
- [ ] Carrito de compra
- [ ] Descuentos
- [ ] Cobro mixto (efectivo, tarjeta, CC)
- [ ] Comprobante
- [ ] Apertura de caja
- [ ] Cierre y arqueo
- [ ] Idempotencia transaccional
- [ ] Reporte diario

---

## H. Compromisos Verificables

### Al Finalizar Cada Fase:
1. Build sin errores
2. Typecheck pasa
3. ESLint pasa
4. Tests pasan (unitarios + integración + E2E si aplica)
5. RLS verificado (`scripts/verificar-rls.sql`)
6. Sin any en TypeScript
7. Sin secretos en Git
8. Git status limpio
9. Rama publicada en origin
10. PR creado y linkeado

### Verificación Final:
- Dos tenants aislados completamente
- Registro → onboarding → clientes → mascotas → turno → consulta → receta PDF → POS → caja → reporte
- Mobile 360px
- Paginación server-side
- Búsqueda full-text
- Permisos efectivos
- Storage multi-tenant
- PWA funcional

---

## I. Decisiones Arquitectónicas a Tomar

| Decisión | Opciones | Recomendación | Razón |
|----------|----------|------|-------|
| Rate Limiting | Redis + middleware vs package vs 3rd party | Package (Upstash) | Serverless, sin infra extra |
| Testing | Vitest + Testing Library vs Jest | Vitest | Más rápido, ESM nativo |
| Forms | react-hook-form vs Formik vs manual | react-hook-form | Ligero, tipado con Zod |
| Table UI | TanStack Table vs custom vs shadcn | Custom (cost benefit) | Paginación server-side, no necesita complejidad |
| Calendario | dnd-kit vs React Calendar vs Fullcalendar | dnd-kit | Control, pequeño, específico |
| PDF | jspdf + jspdf-autotable vs reportlab | jspdf | Ya en stack, cliente-side simple |
| CSV | xlsx vs papaparse vs node-csv | xlsx | Compatible con jspdf, browser-side |
| Email | Resend vs SendGrid vs AWS SES | Resend | Mejor para SaaS, TypeScript first |
| Payments | MercadoPago vs Stripe vs PayPal | MercadoPago | Mercado latinoamericano |

---

## J. Tabla de Checklist de Implementación

(Para usar en PRs y branches)

```markdown
- [ ] Auditoría completada
- [ ] ESLint configurado
- [ ] Vitest configurado
- [ ] GitHub Actions configurado
- [ ] Autenticación completada
- [ ] Base de datos normalizada
- [ ] Clientes: CRUD server-side
- [ ] Mascotas: CRUD server-side
- [ ] Agenda: calendario + CRUD
- [ ] Consultas: CRUD + SOAP + receta PDF
- [ ] POS: búsqueda + carrito + cobro
- [ ] Caja: sesiones + cierre + arqueo
- [ ] Reportes: Excel, PDF, diario
- [ ] Portal cliente: reservas + historial
- [ ] PWA completa
- [ ] Tests E2E (Playwright)
- [ ] Documentación actualizada
- [ ] Deploy verificado
```

---

## K. Próximos Pasos Inmediatos

1. **Crear rama temática** para Fase 2 (autenticación)
2. **Corregir vulnerabilidades npm** (audit fix --force, pero revisar)
3. **Agregar ESLint** (.eslintrc.json, .eslintignore)
4. **Agregar Vitest** (vitest.config.ts, primer test)
5. **Crear primer server action** para RecordsBoard (validado)
6. **Crear route handler** `/api/registros` con validación Zod
7. **Iniciar migración 005** (gestion_clientes mejorado)
8. **Crear tipos TypeScript** desde schema Supabase

---

**Fin de auditoría**
