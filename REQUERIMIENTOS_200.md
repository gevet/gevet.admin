# Requerimientos 200 Features - GeVet SaaS Multitenant

**Versión:** 1.0  
**Fecha:** 2026-09-04  
**Scope:** Plataforma completa de gestión veterinaria empresarial con capacidades clínicas, comerciales y operacionales

---

## 📋 Índice de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura & Principios](#arquitectura--principios)
3. [Módulo 1: Gestión de Clientes (20 features)](#módulo-1-gestión-de-clientes-20-features)
4. [Módulo 2: Gestión de Mascotas (25 features)](#módulo-2-gestión-de-mascotas-25-features)
5. [Módulo 3: Agenda & Turnos (25 features)](#módulo-3-agenda--turnos-25-features)
6. [Módulo 4: Registros Médicos (30 features)](#módulo-4-registros-médicos-30-features)
7. [Módulo 5: Comercial & POS (25 features)](#módulo-5-comercial--pos-25-features)
8. [Módulo 6: Inventario & Laboratorio (20 features)](#módulo-6-inventario--laboratorio-20-features)
9. [Módulo 7: Inteligencia Artificial (15 features)](#módulo-7-inteligencia-artificial-15-features)
10. [Módulo 8: Integraciones & APIs (10 features)](#módulo-8-integraciones--apis-10-features)
11. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Resumen Ejecutivo

GeVet es una **plataforma SaaS multitenant para gestión integral de clínicas veterinarias**. Consolidamos:

- **100 features base** (CRUD core, operaciones diarias)
- **100+ features avanzadas** (AI, telemedicina, integraciones, analytics)

### Matriz de Clasificación

| Categoría | Phase | Priority | Features | Estado |
|-----------|-------|----------|----------|--------|
| **Clientes** | 4-5 | HIGH | 20 | 5/20 ✅ |
| **Mascotas** | 4-5 | HIGH | 25 | 8/25 ⚠️ |
| **Agenda** | 4-5 | HIGH | 25 | 10/25 ⚠️ |
| **Registros Médicos** | 4-6 | HIGH | 30 | 15/30 ⚠️ |
| **Comercial/POS** | 5-6 | HIGH | 25 | 0/25 ❌ |
| **Inventario** | 5-6 | MEDIUM | 20 | 0/20 ❌ |
| **IA** | 7-8 | MEDIUM | 15 | 0/15 ❌ |
| **Integraciones** | 7-8 | MEDIUM | 10 | 0/10 ❌ |
| **TOTAL** | | | **170** | **38/170** |

---

## Arquitectura & Principios

### Principios de Diseño
1. **Multi-tenancy first** - Cada clínica es tenant aislado con RLS
2. **SOAP everywhere** - Todos los registros médicos usan formato SOAP (Subjetivo, Objetivo, Evaluación, Plan)
3. **Audit everything** - Cambios en datos críticos quedan registrados
4. **API-ready** - Backend diseñado para exposición pública (Phase 8)
5. **Progressive enhancement** - Features añadidas sin breaking changes

### Stack Tecnológico
```
Frontend:    Next.js 15 (App Router) + React 19 + TypeScript
Backend:     Next.js Server Actions + Zod validation
Database:    PostgreSQL (Supabase) con RLS policies
Auth:        Supabase Auth + JWT
Storage:     Supabase Storage (S3-compatible)
Messaging:   (Future) Bull/Inngest para async jobs
Search:      (Future) Meilisearch para full-text
Cache:       (Future) Redis para sessions/queries
```

### Estructura de Datos Base

#### Tenant (Clínica/Organización)
```typescript
interface Tenant {
  id: UUID
  nombre: string
  identificacion_fiscal: string
  telefono: string
  email_principal: string
  pais: string
  ciudad: string
  direccion: string
  activo: boolean
  creado_en: timestamp
  actualizado_en: timestamp
}
```

#### Usuarios & RBAC
```typescript
interface GestionUsuario {
  id: UUID
  tenant_id: UUID (RLS)
  email: string UNIQUE
  contraseña_hash: string
  nombre: string
  apellido: string
  perfil: ENUM('admin', 'veterinario', 'asistente', 'recepcionista', 'client')
  activo: boolean
  ultimo_acceso: timestamp
  creado_en: timestamp
}

interface UsuarioRol {
  usuario_id: UUID REFERENCES GestionUsuario
  rol_id: UUID REFERENCES Rol
  asignado_en: timestamp
}

interface Rol {
  id: UUID
  tenant_id: UUID (RLS)
  nombre: string
  permisos: JSONB // {crear_clientes, editar_registros, ver_facturas}
  creado_en: timestamp
}
```

#### Ubicaciones (Multi-sede)
```typescript
interface Sucursal {
  id: UUID
  tenant_id: UUID (RLS)
  nombre: string
  ciudad: string
  direccion: string
  telefono: string
  horario_atencion: JSONB // {lunes: "08:00-18:00", ...}
  veterinarios_asignados: UUID[]
  activo: boolean
  creado_en: timestamp
}
```

---

## Módulo 1: Gestión de Clientes (20 features)

### Propósito
Administrar información completa de propietarios de mascotas, incluyendo contacto, historial de interacciones, cuentas corrientes y preferencias de comunicación.

### Features

#### Phase 4 (Base) - 5/5 ✅
1. **CRUD Clientes** - Crear, listar, editar, soft-delete
   - Campos: nombre, apellido, documento, email, teléfono, dirección, ciudad, iva_condition
   - Validación Zod en servidor
   - Search por nombre/documento
   - Paginación UI (mejorar servidor)

2. **Cliente Detail View** - Vista completa + modo edición
   - Display de datos de contacto
   - Botones Edit/Delete
   - Errores mostrados en banner

3. **Historial de Interacciones** - Timeline básico
   - Mascotas del cliente
   - Turnos asociados
   - Consultas recientes

4. **Soft-Delete Pattern** - Eliminación lógica
   - Campo `activo: boolean`
   - RLS filters `WHERE activo = true`

5. **Search & Filtering** - Búsqueda en tiempo real
   - Por nombre, apellido, documento, teléfono
   - Debounced search

#### Phase 5 (Advanced) - 0/15 ❌

6. **Historial Completo 360°** - Vista 360 del cliente
   - Todas las mascotas
   - Todos los turnos históricos
   - Todas las consultas
   - Todos los pagos
   - Timeline unificada

7. **Cuentas Corrientes** - Gestión de crédito
   - Saldo actual
   - Historial de transacciones
   - Límite de crédito configurable
   - Alertas por mora

8. **Preferencias de Comunicación** - Canal de contacto
   - Email, SMS, WhatsApp
   - Horarios de contacto preferidos
   - Opt-in/opt-out por tipo de notificación

9. **Notas Internas Privadas** - Observaciones del personal
   - Notas timestamped
   - Usuario que escribió
   - No visible para cliente

10. **Importación Masiva CSV** - Bulk upload
    - Parse CSV con validación
    - Batch insert via server action
    - Reporte de errores/éxitos

11. **Etiquetas/Tags Personalizadas** - Segmentación
    - "VIP", "Referencia", "Dudoso", etc.
    - Filtrable en lista
    - Multi-tenant safe

12. **Dirección Alternativa de Entrega** - Múltiples domicilios
    - Dirección principal
    - Dirección alternativa
    - Seleccionar para pedidos/entregas

13. **Datos de Facturación** - Información fiscal
    - Razón social diferente
    - Dirección fiscal
    - Email de facturación

14. **Score de Valor del Cliente** - RFM analytics
    - Recency: último turno
    - Frequency: turnos/año
    - Monetary: monto gastado
    - Recomendación automática: ofrecer promoción si VIP

15. **Vinculación de Clientes** - Familia/Grupo
    - Cliente principal
    - Clientes secundarios (mascotas de otros miembros)
    - Compartir cuenta corriente

16. **Historial de Cambios** - Audit trail
    - Quién modificó qué campo
    - Cuándo
    - Valores antes/después (solo campos sensibles)

17. **Documentos Adjuntos** - Archivos cliente
    - ID (DNI, pasaporte, RUT)
    - Autorizaciones
    - Comprobantes de domicilio

18. **Notificaciones Personalizadas** - Recordatorios
    - Cumpleaños del cliente
    - Aniversario de mascota
    - Consulta de seguimiento pendiente
    - Pago vencido

19. **Portal del Cliente** - Self-service
    - Ver perfil propio
    - Ver mascotas propias
    - Ver turnos propios
    - Ver historial de consultas
    - Descargar documentos

20. **Categorización Automática** - Basada en comportamiento
    - Nuevo vs Existente
    - Activo vs Dormido (sin actividad > 6 meses)
    - Cancelador frecuente
    - Promotor (referencia clientes nuevos)

---

## Módulo 2: Gestión de Mascotas (25 features)

### Propósito
Mantener registro completo de animales, incluyendo identificación física, historial médico, vacunas, alergias, y timeline clínico.

### Features

#### Phase 4 (Base) - 8/8 ✅
1. **CRUD Mascotas** - Crear, listar, editar, soft-delete
   - Cliente propietario (cascading select)
   - Campos: nombre, especie, raza, sexo, color
   - Search por nombre/cliente

2. **Datos Físicos** - Identificación del animal
   - Peso actual (kg)
   - Fecha de nacimiento
   - Color/Marcas
   - Foto (upload a Storage)

3. **Historial Médico** - Referencia a turnos/consultas
   - Lista de consultas
   - Lista de turnos
   - Filtrable por fecha

4. **Cascading Cliente → Mascota** - UX mejorada
   - Select cliente
   - Load mascotas del cliente
   - Select mascota

5. **Soft-Delete Pattern** - Eliminación lógica
   - Mascotas "archivadas"

6. **Alergias y Condiciones** - Historial médico básico
   - Alergias (texto libre)
   - Condiciones crónicas (texto)
   - Observaciones

7. **Especie & Raza** - Taxonomía veterinaria
   - Dropdown hardcoded: Perro, Gato, Ave, Reptil, Roedor
   - Razas por especie (seed data)

8. **Identificadores Únicos** - Trazabilidad
   - Microchip number (opcional)
   - Tatuaje/Marca (opcional)
   - RFID tag (future IoT)

#### Phase 5-6 (Advanced) - 0/17 ❌

9. **Timeline Clínico Visual** - Historial gráfico
   - Línea de tiempo con eventos
   - Vacunas en verde
   - Cirugías en rojo
   - Consultas en azul

10. **Protocolo de Vacunas** - Gestión de inmunizaciones
    - Vacuna + fecha + próxima dosis
    - Alertas automáticas 2 semanas antes
    - Comprobantes descargables
    - Calendario por especie/edad

11. **Desparasitación** - Plan de tratamiento
    - Interno (meses x año)
    - Externo (meses x año)
    - Historial de aplicaciones

12. **Esterilización/Castración** - Evento quirúrgico
    - Fecha del procedimiento
    - Veterinario
    - Complicaciones

13. **Comportamiento & Temperamento** - Notas conductuales
    - Nivel de agresividad
    - Reacciones al manejo
    - Fobias/Traumas
    - Alertas para personal

14. **Medicamentos Actuales** - Plan activo
    - Medicamento
    - Dosis
    - Frecuencia
    - Fecha inicio/fin
    - Indicación

15. **Restricciones Dietéticas** - Alimentos prohibidos
    - Alergias alimentarias
    - Sensibilidades
    - Dieta actual
    - Notas nutricionales

16. **Documentos Médicos** - Archivos por mascota
    - Radiografías
    - Análisis de laboratorio
    - Certificados de vacunación
    - Reportes de cirugía

17. **Foto e Identificación Visual** - Galería
    - Foto principal
    - Fotos adicionales (para búsqueda si se pierde)
    - Versiones para carnet de mascota

18. **Contacto de Emergencia Específico** - Por mascota
    - Puede ser diferente al cliente
    - Nombre + teléfono
    - Relación (amigo, familiar, veterinario)

19. **Chip Electrónico Registry** - Integración con registros nacionales
    - Registrar chip con datos mascota
    - Sincronizar con base nacional
    - Verificar pertenencia

20. **Seguros & Pólizas** - Información de cobertura
    - Compañía aseguradora
    - Número de póliza
    - Cobertura máxima
    - Fecha vencimiento

21. **Historial Reproductivo** - Para criaderos
    - Camadas/Gestaciones
    - Datos de fertilidad
    - Descendientes registrados

22. **Expediente Digitalizado** - Document management
    - Toda documentación en un lugar
    - Búsqueda full-text
    - Versionado de cambios

23. **Alertas Automáticas** - Notificaciones
    - Próxima vacuna vencida
    - Medicamento a punto de acabarse
    - Cumpleaños
    - Seguimiento post-consulta

24. **Etiquetas de Estado** - Rápida identificación
    - "Embarazada", "Recuperándose", "Alérgico", "Agresivo"
    - Color-coded
    - Filtrable

25. **Mascota Perdida/Encontrada** - SOS
    - Reportar como desaparecida
    - Foto + recompensa
    - Búsqueda en BD mascotas perdidas de otros tenants
    - Integración (future) con redes sociales

---

## Módulo 3: Agenda & Turnos (25 features)

### Propósito
Gestionar citas veterinarias con capacidades de scheduling avanzado, notificaciones, check-in y salas de espera.

### Features

#### Phase 4 (Base) - 10/10 ✅
1. **CRUD Turnos** - Crear, listar, editar, eliminar
   - Cliente + Mascota (cascading)
   - Fecha + Hora
   - Duración (15-120 min)
   - Motivo + Notas

2. **Vista de Calendario Mensual** - Visualización grid
   - Navegación prev/next/hoy
   - Eventos por día
   - "+X más" para overflow

3. **Cascading Cliente → Mascota** - UX mejorada
   - Select cliente
   - Load mascotas
   - Select mascota

4. **Notificación de Turno** - Feedback al crear
   - Toast success al guardar
   - Mensaje de error si falla

5. **Validación de Disponibilidad** - Slots no dobles
   - Verificar veterinario no tiene otro turno
   - (Simple por ahora, mejorar en Phase 5)

6. **Duración Variable** - Flexibilidad de tiempo
   - 15, 30, 45, 60, 90, 120 minutos
   - Predeterminado según tipo de consulta

7. **Motivo de Consulta** - Categorización
   - Consulta general, Vacunas, Cirugía, etc.
   - Texto libre

8. **Notas del Turno** - Observaciones breves
   - Información adicional para veterinario
   - Instrucciones especiales (ayuno, etc.)

9. **Estado del Turno** - Workflow simple
   - Agendado, En curso, Completado, Cancelado
   - Cambio de estado manual

10. **Eliminar/Cancelar Turno** - Gestión
    - Soft-delete
    - Notificación al cliente (future)

#### Phase 5-6 (Advanced) - 0/15 ❌

11. **Vista de Semana/Día** - Alternativas de visualización
    - Semana: 7 columnas (veterinarios/salas)
    - Día: detalles por hora
    - Arrastrable a otra hora (Phase 6)

12. **Drag-and-Drop Reschedule** - Cambio rápido
    - Arrastrar turno en calendario
    - Soltar en nuevo horario
    - Validar disponibilidad
    - Notificación automática al cliente

13. **Turnos Recurrentes** - Seguimientos programados
    - Crear serie (semanal, mensual)
    - Editar serie o solo instancia
    - Cancelar serie

14. **Disponibilidad de Veterinarios** - Horarios por sucursal
    - Horario laboral
    - Vacaciones/Ausencias
    - Disponibilidad por tipo de consulta
    - Over-booking limit

15. **Overbooking Automático** - Buffer de tiempo
    - Tiempo de preparación antes
    - Tiempo de limpieza después
    - No permitir overlap

16. **Check-in Mobile** - Tableta en recepción
    - Escanear QR turno
    - Marcar cliente como "llegó"
    - Timestamp automático

17. **Sala de Espera Virtual** - Gestión del flujo
    - Panel de pacientes esperando
    - Orden de atención
    - Notificar cuando llamar
    - Integración con TVs de espera (future)

18. **Cambio de Veterinario** - Reassignación
    - Permitir cambio si otro disponible
    - Preferencia del cliente por veterinario

19. **Recordatorios Automáticos** - Notificaciones
    - Email 24h antes
    - SMS 2h antes
    - WhatsApp con link de confirmación
    - Posibilidad de cancelar vía mensaje

20. **Cancelación por Cliente** - Self-service
    - Link en email/SMS
    - Requiere confirmación
    - Libera slot automáticamente

21. **Reasignación Automática** - Cuando hay cancelación
    - Cliente en waiting list
    - Ofertar slot liberado
    - Notificación automática

22. **Tipos de Consulta** - Duraciones estándar
    - "Consulta general" → 30 min
    - "Vacunas" → 20 min
    - "Cirugía menor" → 60 min
    - "Seguimiento" → 15 min

23. **Disponibilidad por Sucursal** - Multi-sede
    - Cada sucursal con horarios
    - Cliente elige sucursal preferida
    - Turno asignado a sucursal

24. **Turnos de Emergencia** - Priorización
    - Marcar como "urgente"
    - Aparecer en top de espera
    - Notificación inmediata a veterinario

25. **Exportar Calendario** - Integración externa
    - ICS/Outlook format
    - Google Calendar sync
    - CSV report por período

---

## Módulo 4: Registros Médicos (30 features)

### Propósito
Mantener registros clínicos SOAP completos, vitales, diagnósticos, tratamientos y seguimientos.

### Features

#### Phase 4 (Base) - 15/15 ✅
1. **CRUD Consultas SOAP** - Crear, listar, ver, editar
   - Subjetivo (anamnesis)
   - Objetivo (examen físico)
   - Evaluación (diagnóstico diferencial)
   - Plan (tratamiento)

2. **Datos Vitales** - Parámetros fisiológicos
   - Temperatura (°C)
   - Frecuencia cardíaca (bpm)
   - Frecuencia respiratoria (rpm)
   - Peso actual (kg)
   - Presión arterial (opcional)

3. **Diagnóstico Principal** - Conclusión clínica
   - Texto libre
   - Código de diagnóstico (future: ICD-VET)

4. **Prescripciones** - Plan farmacológico
   - Medicamento
   - Dosis
   - Frecuencia
   - Duración
   - Instrucciones especiales

5. **Referencia a Especialista** - Derivación
   - Nombre especialidad
   - Observaciones
   - Badge visual

6. **Observaciones Adicionales** - Notas generales
   - Comportamiento del animal
   - Información adicional
   - Recomendaciones post-consulta

7. **Fecha/Hora Consulta** - Timestamp automático
   - Creado_en: cuando se registra
   - Consultada_en: cuándo fue realmente (puede diferir)

8. **Link a Turno** - Asociación con agenda
   - turno_id referencial
   - Backlink desde turno

9. **Link a Mascota** - Identificación del paciente
   - mascota_id
   - Información básica mostrada

10. **Veterinario Responsable** - Usuario que escribió
    - De sesión autenticada
    - Nombre + timestamp

11. **Búsqueda por Diagnóstico** - Filtrado
    - Texto free search en diagnóstico
    - Debounced
    - Resultados instantáneos

12. **Vista Detallada Completa** - Lectura
    - Todas las secciones SOAP
    - Datos vitales formato tabla
    - Prescripciones formato lista
    - Timestamps de auditoría

13. **Edición Versioned** - Cambios históricos
    - Registrar versiones anteriores
    - Audit trail: quién cambió qué

14. **Print Friendly** - Impresión
    - CSS print optimizado
    - window.print() integrado
    - Formato veterinario estándar

15. **Relación Múltiple Turnos** - Historia
    - Una consulta por turno
    - Turno → Consulta (one-to-one, soft)

#### Phase 5-7 (Advanced) - 0/15 ❌

16. **PDF Export** - Documento descargable
    - puppeteer o similar
    - Firma digital veterinario
    - Logo clínica
    - Formato oficial

17. **Protocolo Médico de Especie** - Template
    - Preguntas estándar para perro/gato/ave/etc
    - Checkboxes pre-poblados
    - Reducir tiempo documentación

18. **Signos Vitales Gráfico** - Visualización
    - Gráfico de temperatura vs tiempo
    - Gráfico FC vs tiempo
    - Cambios de peso (línea)

19. **Diagnóstico Asistido por IA** - Sugerencias
    - Analizar síntomas (subjetivo + objetivo)
    - Sugerir diagnósticos diferenciales
    - Basado en historial mascota
    - NO reemplaza veterinario, solo asiste

20. **Búsqueda de Síntomas Similar** - Precedentes
    - "Mascota X presentó este cuadro hace 3 meses"
    - Link a consulta previa
    - Ayuda a diagnóstico

21. **Medicamentos Guardar Favoritos** - Biblioteca
    - Medicamentos frecuentes
    - One-click agregar
    - Dosis sugerida por especie

22. **Imágenes Diagnósticas** - Archivos médicos
    - Upload radiografías
    - Ultrasound videos
    - Foto heridas
    - Versionado (antes/después)

23. **Laboratorio Integrado** - Resultados
    - Solicitud de análisis
    - Recepción de resultados
    - Comparar con valores normales
    - Gráficos (hemograma, bioquímica)

24. **Seguimiento Post-Consulta** - Plan
    - Crear recordatorio automático
    - "Revisar en 7 días"
    - "Llamar cliente en 3 días"
    - Checklist de acciones

25. **Notas Privadas del Veterinario** - Confidencial
    - Observaciones personales
    - Dudas diagnósticas
    - Notas educativas
    - No visible en reportes

26. **Interconsulta** - Consulta entre veterinarios
    - Caso llevado por asistente a otro vet
    - Thread de comentarios
    - Resolución documentada

27. **Medicamentos Contraindicados** - Seguridad
    - Base de datos de interacciones
    - Alerta si prescribir medicamento
    - Alerta si alergia conocida
    - Requerimiento de override

28. **Receta Digital** - Prescripción electrónica
    - Descargable/imprimible
    - QR con datos del medicamento
    - Válido legalmente (future: integración AFIP)

29. **Consentimiento Informado** - Documentación legal
    - Procedimientos quirúrgicos
    - Anestesias
    - Tratamientos de riesgo
    - Firma digital cliente

30. **Auditoría de Cambios** - Compliance
    - Quién modificó qué campo
    - Cuándo
    - Valores antes/después
    - Razón del cambio

---

## Módulo 5: Comercial & POS (25 features)

### Propósito
Gestionar ventas, facturas, pagos y control de caja.

### Features

#### Phase 5 (Base) - 0/25 ❌

1. **POS Básico** - Punto de venta
   - Crear venta rápida
   - Búsqueda de producto
   - Cantidad + precio
   - Total automático

2. **Productos/Servicios** - Catálogo
   - Nombre, descripción
   - Precio unitario
   - Stock actual (si aplica)
   - Categoría
   - Imagen

3. **Carrito de Compras** - Edición
   - Agregar/remover items
   - Cambiar cantidad
   - Editar precio (override)
   - Descuento por línea

4. **Métodos de Pago** - Múltiples opciones
   - Efectivo
   - Tarjeta débito/crédito
   - Transferencia bancaria
   - Cheque (si aplica)
   - Cuenta corriente (crédito)

5. **Descuentos** - Políticas de precios
   - Por línea (%)
   - Total carrito (%)
   - Coupon codes
   - Cliente VIP (automático)

6. **Recibo** - Documento inmediato
   - PDF autoimpresión
   - Email al cliente
   - Datos con fecha/hora
   - Número de recibo secuencial

7. **Factura Electrónica** - Documento fiscal
   - Integración AFIP (Argentina) / SRI (Ecuador) / equivalente
   - Número correlativo
   - XML firmado
   - Estado: Borrador → Emitida → Cancelada

8. **Facturación Posterior** - Diferida
   - Venta sin factura inmediata
   - Facturar después
   - Batch invoicing

9. **Retenciones/IVA** - Cálculos fiscales
   - Condición IVA cliente
   - Cálculo automático
   - Detalle por alícuota

10. **Cambios/Devoluciones** - Gestión de reembolsos
    - Crear nota de crédito
    - Reembolsar efectivo
    - Reembolsar a tarjeta (future: integración banco)
    - Producto devuelto a stock

11. **Cuentas Corrientes** - Crédito a clientes
    - Saldo actual
    - Límite de crédito
    - Movimientos
    - Cobro de mora
    - Historial pagos

12. **Remitos** - Comprobante de entrega
    - Generado en POS
    - Firma del cliente
    - Foto de entrega (future)

13. **Control de Caja** - Diario
    - Apertura (efectivo inicial)
    - Cierre (total efectivo)
    - Diferencia (faltante/sobrante)
    - Usuario que abrió/cerró

14. **Reporte de Ventas** - Por período
    - Total ventas diarias/semanal/mensual
    - Por vendedor
    - Por método de pago
    - Por cliente/producto

15. **Análisis de Inventario** - Stock
    - Productos con stock bajo
    - Stock mínimo configurable
    - Alertas automáticas
    - Rotación (FIFO)

16. **Proveedores** - Gestión de compras
    - Registro de proveedor
    - Contacto
    - Condiciones de pago
    - Historial de compras

17. **Órdenes de Compra** - Adquisición
    - Crear OC a proveedor
    - Seguimiento estado
    - Recepción de mercadería
    - Conciliación con factura proveedor

18. **Pago a Proveedores** - Cuentas por pagar
    - Vencimiento
    - Forma de pago
    - Comprobante de pago

19. **Arqueo de Caja** - Conciliación
    - Diferencia efectivo vs registro
    - Depósitos bancarios
    - Reportar faltante/sobrante

20. **Integración PayPal/Stripe** - Pasarelas
    - Aceptar pagos online
    - Webhook de confirmación
    - Depósito automático (next day o same-day)

21. **QR de Pago** - Código dinámico
    - Generar QR por compra
    - Cliente escanea con celular
    - Paga vía Mercado Pago / transferencia

22. **Reportes Fiscal** - Compliance
    - Resumen mensual IVA
    - Resumen retenciones
    - Exportar para contador

23. **Auditoría de Anulaciones** - Seguridad
    - Quién anuló qué factura
    - Cuándo
    - Razón
    - Requiere supervisor

24. **Terminales de Pago** - Hardware
    - Integración banda magnética/chip
    - Impresora térmica receipt
    - Gaveta de caja

25. **Exportación Contable** - Integración ERP
    - Archivo QIF/CSV para contador
    - Asientos contables automáticos
    - Códigos de cuenta configurables

---

## Módulo 6: Inventario & Laboratorio (20 features)

### Propósito
Gestionar medicamentos, insumos, reactivos de laboratorio y controles de calidad.

### Features

#### Phase 5-6 (Base) - 0/20 ❌

1. **Gestión de Medicamentos** - Inventario
   - Nombre comercial/genérico
   - Principio activo
   - Concentración
   - Forma farmacéutica (tableta, inyectable, etc)
   - Stock actual
   - Precio costo/venta

2. **Stock Mínimo/Máximo** - Control automático
   - Nivel mínimo configurable
   - Alerta cuando cae por debajo
   - Sugerencia de compra automática

3. **Lotes y Expiración** - Trazabilidad
   - Número de lote
   - Fecha vencimiento
   - Cantidad por lote
   - Avisar 1 mes antes de vencimiento

4. **Recepción de Compra** - Ingreso
   - Escanear código de barras
   - Cantidad recibida vs OC
   - Inspección de calidad (check)
   - Guardado de lote/vencimiento

5. **Egreso de Farmacia** - Consumo
   - Seleccionar medicamento
   - Cantidad
   - Destinatario (consulta, cliente, etc)
   - Autorizado por veterinario

6. **Control de Acceso Farmacia** - Seguridad
   - Medicamentos controlados (antibióticos, anestésicos)
   - Requerimiento de autorización especial
   - Audit trail completo

7. **Código de Barras** - Automatización
   - Etiquetas impresas en recepción
   - Lectura rápida en POS
   - GS1 compliant (future)

8. **Categorización** - Taxonomía
   - Antibióticos, Antiinflamatorios, Anestésicos, etc
   - Búsqueda por categoría
   - Filtros avanzados

9. **Laboratorio de Análisis** - Servicios clínicos
   - Tipos de análisis (hemograma, bioquímica, etc)
   - Paquetes estándar (perro adulto, gato joven, etc)
   - Precios

10. **Solicitud de Análisis** - Desde consulta
    - Crear orden desde SOAP
    - Seleccionar tipo análisis
    - Recolección muestra (sangre, orina, heces)
    - Turno de toma

11. **Recepción de Muestra** - Laboratorio
    - Código de muestra
    - Fecha/hora recepción
    - Condiciones de almacenamiento

12. **Procesamiento de Análisis** - Resultados
    - Ingreso manual o via equipo automatizado
    - Parámetros vs rangos normales
    - Valores anormales resaltados
    - Nota interpretativa

13. **Valores de Referencia** - Por especie/edad
    - Base de datos de rangos normales
    - Perro joven vs adulto vs geriatría
    - Gato, Ave, Reptil, etc
    - Editable por veterinario

14. **Historial de Análisis** - Mascota
    - Gráficos de evolución
    - Comparación con análisis previos
    - Tendencias

15. **Validación de Resultados** - Control de calidad
    - Revisar por veterinario antes de reportar
    - Comentario si valor sospechoso
    - Retest automático si falla control

16. **Reporte de Análisis** - Documento
    - PDF profesional
    - Valores, rangos, interpretación
    - Firma veterinario
    - Email al cliente

17. **Proveedores de Laboratorio** - Terceristas
    - Laboratorios externos
    - Servicios especializados (genética, histopatología)
    - Envío de muestras
    - Integración: recibir resultados via email/API

18. **Equipos de Laboratorio** - Máquinas
    - Registro de equipo (analizador)
    - Mantenimiento programado
    - Calibración requerida
    - Control de calidad (blancos, controles)

19. **Consumibles** - Insumos descartables
    - Jeringuillas, agujas, tubos, cultivos
    - Stock por tipo
    - Alertas de reorden

20. **Integración EHR** - Datos en historial
    - Resultados automáticamente en registro médico
    - Link bidireccional solicitud ↔ resultado
    - Timeline de análisis en mascota

---

## Módulo 7: Inteligencia Artificial (15 features)

### Propósito
Asistencia inteligente para diagnóstico, predicción y automatización.

### Features

#### Phase 7-8 (Advanced) - 0/15 ❌

1. **Asistente de Diagnóstico** - Sugerencias IA
   - Input: síntomas + exploración física
   - Output: diagnósticos diferenciales rankeados
   - Confianza %
   - Links a estudios (Wikipedia, AVMA)

2. **Análisis de Síntomas** - NLP
   - Parse descripción clínica (subjetivo)
   - Extrae síntomas principales
   - Agrupa en síndromes
   - Sugerencias de pruebas

3. **Modelos Entrenados** - Veterinaria
   - Dataset 10,000+ casos
   - Separado por especie
   - Actualizado mensualmente
   - Trazabilidad de precisión

4. **Predicción de Severidad** - Risk scoring
   - Clasificar caso como leve/moderado/grave
   - Basado en edad, síntomas, vitales
   - Alerta si posible emergencia
   - Recomendación: derivar

5. **Recomendación de Pruebas** - Evidence-based
   - "Para este diagnóstico, hacer hemograma + bioquímica"
   - Basado en guidelines internacionales
   - No obligatorio, solo sugerencia

6. **Interpretación de Análisis** - Explicación
   - "Valor anormal de hemoglobina sugiere anemia"
   - Link a diferenciador: por edad, dieta, hemólisis
   - Recomendación: transfusión vs suplementación

7. **Chatbot Soporte 24/7** - FAQ automático
   - "¿Qué hago si mi perro come chocolate?"
   - Respuesta inmediata
   - Escalate a humano si necesario

8. **Generador de Protocolos** - Templates
   - "Protocolo post-castración"
   - Cuidados, medicamentos, seguimiento
   - Personalizado por edad/comorbilidades

9. **Análisis de Imágenes** - Computer vision
   - Upload radiografía
   - IA identifica anomalías
   - Densidades, fracturas, opacidades
   - Marca zonas sospechosas

10. **Predicción de Pronóstico** - Machine learning
    - Basado en diagnóstico + tratamiento previos
    - "Casos similares: 80% sobreviven con este plan"
    - Honestidad: "Pronóstico guardado" si dudoso

11. **Recomendador de Medicamentos** - Dosing assistance
    - Input: diagnóstico, peso, edad, comorbilidades
    - Output: medicamento + dosis sugerida
    - Contraindicaciones automáticas
    - Alternativas si alergia conocida

12. **Automatización de Documentación** - Redacción
    - Dictado de voz → texto SOAP
    - Spelling/grammar check
    - Expandir con datos de mascota/historial
    - Voz a PDF

13. **Predicción de No-show** - Optimización agenda
    - "Este cliente tiene 30% probabilidad de cancelar"
    - Overbooking automático si probabilidad alta
    - Recordatorio reforzado

14. **Análisis de Rentabilidad** - Business intel
    - "Servicio X generalmente tiene margen 40%"
    - "Cliente Y tiene LTCV 3000 USD"
    - Recomendación: ofrecer servicios premium

15. **Vigilancia Epidemiológica** - Salud pública
    - Detectar brotes de enfermedades (anónimamente entre tenants)
    - "Sarna ha subido 40% en la región este mes"
    - Alerta veterinarios en zona

---

## Módulo 8: Integraciones & APIs (10 features)

### Propósito
Conectar con sistemas externos y permitir extensibilidad.

### Features

#### Phase 7-8 (Advanced) - 0/10 ❌

1. **API REST Pública** - Acceso programático
   - Endpoints para CRUD clientes/mascotas/turnos
   - Autenticación OAuth 2.0
   - Rate limiting
   - Documentación Swagger

2. **Webhooks** - Eventos en tiempo real
   - Evento: consulta creada
   - Enviado a URL del cliente
   - Reintentos automáticos
   - Firma HMAC para verificar

3. **Integración Google Calendar** - Sincronización
   - Exportar turnos a GCal
   - Importar disponibilidad de Google
   - Two-way sync
   - Notificaciones de cambios

4. **Integración Outlook** - Sincronización
   - Similar a Google Calendar
   - iCalendar support

5. **SMS Notifications** - Twilio/AWS SNS
   - Recordatorio turno 24h antes
   - SMS de confirmación
   - Código OTP para check-in

6. **Email Templates** - Customización
   - Diseñador visual
   - Personalización (nombre cliente, etc)
   - Test send
   - A/B testing (future)

7. **Integración con HR** - Nómina
   - Export a SistemaNómina XYZ
   - Datos asistencia (turnos atendidos)
   - Comisiones por consultas

8. **Sincronización de Datos** - Cloud backup
   - Nightly sync a AWS S3
   - Versionado de backups
   - Restore point-in-time

9. **Analytics Externo** - Mixpanel/Amplitude
   - Track eventos usuario
   - Funnel analysis: agregar cliente → pagar
   - Retention cohorts
   - Funnels por tenant

10. **Single Sign-On (SSO)** - SAML/OIDC
    - Integración con Azure AD
    - Google Workspace
    - Okta
    - Usuarios sincronizados automáticamente

---

## Roadmap de Implementación

### Fases de Desarrollo

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP GEVET 200 FEATURES               │
└─────────────────────────────────────────────────────────────┘

PHASE 4 ✅ (Actual)
├─ Módulo 1: Clientes (CRUD base)
├─ Módulo 2: Mascotas (CRUD base)
├─ Módulo 3: Agenda (Vista mensual + CRUD)
├─ Módulo 4: Registros Médicos (SOAP base)
└─ Dashboard básico
   Features: 38/170 | Duración: 2-3 semanas | Status: COMPLETADO

PHASE 5 🔄 (Next)
├─ Módulo 1: Clientes Advanced (historial 360°, cuentas corrientes)
├─ Módulo 2: Mascotas Advanced (timeline, vacunas)
├─ Módulo 3: Agenda Advanced (drag-drop, check-in)
├─ Módulo 4: Registros Médicos Advanced (PDF, IA diagnostico)
├─ Módulo 5: POS & Comercial (facturación básica)
└─ Testing (Unit + RLS security tests)
   Features: +60 features | Duración: 4-5 semanas | Status: PENDING

PHASE 6 🔮 (Follow)
├─ Módulo 6: Inventario & Laboratorio
├─ Módulo 2: Mascotas Timeline visual
├─ Módulo 3: Sala de espera + Notificaciones
└─ Performance optimization (indexing, caching)
   Features: +35 features | Duración: 3-4 semanas | Status: PENDING

PHASE 7 🚀 (Advanced)
├─ Módulo 7: IA & Analytics
├─ Módulo 8: Integraciones (Google Calendar, SMS, API)
└─ CI/CD pipeline + Monitoring
   Features: +25 features | Duración: 4-5 semanas | Status: PENDING

PHASE 8 💎 (Enterprise)
├─ Multi-location management
├─ White-label customization
├─ Advanced compliance (GDPR, HIPAA-equivalent)
├─ Enterprise support SLA
└─ Custom integrations
   Features: +12 features | Duración: ongoing | Status: PENDING
```

### Dependencias Críticas

```
┌─────────────────────────────────────────────────────────────┐
│             DEPENDENCY GRAPH - BLOQUEADORES                 │
└─────────────────────────────────────────────────────────────┘

Database Schema
├─ MUST: RLS policies completas ✅
├─ MUST: Todos los índices ⚠️ (en progress)
├─ MUST: Audit logging tables ❌ (Phase 5)
└─ MUST: Soft-delete patterns ✅

Authentication
├─ MUST: Supabase Auth ✅
├─ MUST: RBAC en servidor ⚠️ (implementado pero no enforced UI)
├─ MUST: JWT validation ✅
└─ MUST: SSO setup ❌ (Phase 7)

Testing Infrastructure
├─ MUST: Jest + React Testing Library ❌ (bloqueador Phase 5)
├─ MUST: RLS security tests ❌ (bloqueador Phase 5)
├─ MUST: E2E tests (Playwright) ❌ (Phase 6)
└─ MUST: Performance tests ❌ (Phase 6)

Performance
├─ MUST: Server-side pagination ⚠️ (basic en Phase 4)
├─ MUST: Query optimization ❌ (Phase 5)
├─ MUST: Caching (Redis) ❌ (Phase 5-6)
└─ MUST: CDN + Image optimization ❌ (Phase 6)

Observability
├─ MUST: Error tracking (Sentry) ❌ (Phase 5)
├─ MUST: Logging (Logflare) ❌ (Phase 5)
├─ MUST: Monitoring (DataDog) ❌ (Phase 6)
└─ MUST: Alerting ❌ (Phase 6)
```

### Criterios de Aceptación por Phase

#### Phase 5 Acceptance (Bloqueador)
- [ ] All tests pass (>80% coverage)
- [ ] RLS validated with cross-tenant test data
- [ ] Security audit completed, zero critical findings
- [ ] Performance baseline established (<200ms p95)
- [ ] Zero critical bugs in Phase 4 code

#### Phase 6 Acceptance
- [ ] Advanced features functional end-to-end
- [ ] Performance optimized (N+1 queries fixed)
- [ ] Load tested with 1000+ entities
- [ ] UI Polish complete (animations, accessibility)
- [ ] Phase 5 features >90% stable

#### Phase 7+ Acceptance
- [ ] IA models trained and validated
- [ ] Integrations tested with sandbox accounts
- [ ] Enterprise features demoed to customer
- [ ] SLA metrics established

---

## Conclusiones

**Scope:** 170+ features distribuidas en 8 módulos temáticos

**Arquitectura:** Multi-tenant, API-first, audit-ready

**Timeline:** 18-24 meses para MVP completo (Phases 1-6)

**Inversión:** ~2000-2500 horas de desarrollo

**Siguiente:** Comenzar Phase 5 con prioridad en Testing + Advanced Clientes/Agenda

