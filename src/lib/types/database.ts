/**
 * Database type definitions for GeVet multi-tenant system
 * Generated from Supabase schema (Phase 3 normalization)
 *
 * These types are used for server-side data access and validation.
 * Client types are generated separately with `npm run gen:types`.
 */

export interface Tenant {
  id: string
  nombre_comercial: string
  slug: string
  timezone: string
  moneda: string
  estado: 'trial' | 'activo' | 'suspendido' | 'cancelado'
  onboarding_completado: boolean
  trial_termina_en: string
  creado_en: string
  actualizado_en: string | null
}

export interface GestionUsuario {
  id: string
  tenant_id: string
  auth_user_id: string
  nombre: string
  email: string
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

export interface TenantBranding {
  id: string
  tenant_id: string
  color_primario: string
  color_secundario: string
  color_acento: string
  logo_url: string | null
  creado_en: string
  actualizado_en: string | null
}

export interface Cliente {
  id: string
  tenant_id: string
  tipo_documento: 'DNI' | 'CUIT' | 'CUIL' | 'PASAPORTE' | 'OTRO'
  numero_documento: string
  nombre: string
  apellido: string
  razon_social: string | null
  email: string | null
  telefono: string | null
  celular: string | null
  direccion: string | null
  numero_calle: string | null
  apartamento: string | null
  ciudad: string | null
  provincia: string | null
  codigo_postal: string | null
  pais: string
  responsable_iva: boolean
  condicion_iva?: 'Consumidor Final' | 'Responsable Inscripto' | 'Responsable No Inscripto' | 'Exento' | 'No Categorizado' | null
  observaciones: string | null
  activo: boolean
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface Mascota {
  id: string
  tenant_id: string
  cliente_id: string
  nombre: string
  especie: 'Perro' | 'Gato' | 'Conejo' | 'Roedor' | 'Ave' | 'Reptil' | 'Otro'
  raza: string | null
  sexo?: 'Macho' | 'Hembra' | 'Desconocido' | null
  microchip: string | null
  numero_tatuaje: string | null
  color: string | null
  peso_kg: number | null
  fecha_nacimiento: string | null
  foto_url: string | null
  alergias: string | null
  condiciones_cronicas: string | null
  observaciones: string | null
  activo: boolean
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface Turno {
  id: string
  tenant_id: string
  cliente_id: string
  mascota_id: string
  profesional_id: string | null
  fecha_hora: string
  duracion_minutos: number
  motivo: string
  notas: string | null
  estado: 'Pendiente' | 'Confirmado' | 'En Progreso' | 'Completado' | 'Cancelado' | 'No-Show'
  razon_cancelacion: string | null
  observaciones: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface Consulta {
  id: string
  tenant_id: string
  turno_id: string
  cliente_id: string
  mascota_id: string
  profesional_id: string
  subjetivo: string | null
  objetivo: string | null
  evaluacion: string
  plan: string
  temperatura_celsius: number | null
  frecuencia_cardiaca_bpm: number | null
  frecuencia_respiratoria_rpm: number | null
  peso_kg: number | null
  diagnostico: string | null
  prescripciones: string | null
  observaciones: string | null
  referencia_a_especialista: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface Rol {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  permisos: string[]
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

export interface Sucursal {
  id: string
  tenant_id: string
  nombre: string
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  horario_apertura: string | null
  horario_cierre: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

export interface UsuarioRol {
  id: string
  tenant_id: string
  usuario_id: string
  rol_id: string
  creado_en: string
}

/**
 * Database context that includes tenant isolation
 * Used for RLS-aware queries in server actions
 */
export interface DbContext {
  tenant_id: string
  user_id: string
  user_email: string
}

/**
 * Aggregated user view including roles and permissions
 */
export interface UsuarioConRoles extends GestionUsuario {
  roles: Rol[]
  permisos: Set<string>
}

/**
 * Cuentas Corrientes (Accounts Receivable)
 * Tracks client balance and payment terms
 */
export interface CuentaCorriente {
  id: string
  tenant_id: string
  cliente_id: string
  saldo_deuda: number
  saldo_favor: number
  limite_credito: number
  condicion_pago: 'Contado' | 'Plazo 7' | 'Plazo 15' | 'Plazo 30' | 'Plazo 45' | 'Plazo 60'
  dias_de_gracia: number
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

/**
 * Movimientos de Cuentas Corrientes (Account Transactions)
 * Tracks debits (charges) and credits (payments) for each account
 */
export interface MovimientoCuentaCorriente {
  id: string
  tenant_id: string
  cliente_id: string
  cuenta_corriente_id: string
  tipo: 'Cargo' | 'Abono' | 'Ajuste'
  monto: number
  saldo_anterior: number
  saldo_nuevo: number
  referencia_tipo: 'Venta' | 'Pago' | 'Devolución' | 'Ajuste' | 'Nota de Crédito'
  referencia_id: string | null
  descripcion: string
  fecha_vencimiento: string | null
  creado_por: string
  creado_en: string
}
