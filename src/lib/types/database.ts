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

/**
 * Productos (Inventory/Products)
 * Tracks veterinary products, medicines, food, accessories available for sale
 */
export interface Producto {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  precio_venta: number
  precio_costo: number | null
  stock_cantidad: number
  unidad: string
  categoria: string | null
  codigo_barras: string | null
  proveedor: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

/**
 * Proveedores (Suppliers)
 */
export interface Proveedor {
  id: string
  tenant_id: string
  razon_social: string
  nombre_fantasia: string | null
  cuit: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  contacto: string | null
  condicion_pago: string
  observaciones: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

/**
 * Órdenes de compra (Purchase orders)
 */
export interface OrdenCompra {
  id: string
  tenant_id: string
  proveedor_id: string
  numero: number
  fecha: string
  fecha_entrega_estimada: string | null
  estado: 'Borrador' | 'Enviada' | 'Recibida Parcial' | 'Recibida' | 'Cancelada'
  subtotal: number
  impuestos: number
  total: number
  observaciones: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface OrdenCompraItem {
  id: string
  tenant_id: string
  orden_id: string
  producto_id: string
  cantidad: number
  cantidad_recibida: number
  precio_unitario: number
  subtotal: number
  creado_en: string
}

/**
 * Plan de cuentas (Chart of accounts)
 */
export interface CuentaContable {
  id: string
  tenant_id: string
  codigo: string
  nombre: string
  tipo: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Egreso'
  imputable: boolean
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

/**
 * Asientos contables (Journal entries)
 */
export interface AsientoContable {
  id: string
  tenant_id: string
  numero: number
  fecha: string
  descripcion: string
  referencia_tipo: string | null
  referencia_id: string | null
  total_debe: number
  total_haber: number
  estado: 'Borrador' | 'Registrado' | 'Anulado'
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface AsientoLinea {
  id: string
  tenant_id: string
  asiento_id: string
  cuenta_id: string
  debe: number
  haber: number
  descripcion: string | null
  creado_en: string
}

/**
 * Laboratorio: catálogo de estudios
 */
export interface EstudioLaboratorio {
  id: string
  tenant_id: string
  codigo: string | null
  nombre: string
  categoria: string | null
  precio: number
  unidad: string | null
  valor_referencia_min: number | null
  valor_referencia_max: number | null
  tiempo_entrega_horas: number
  activo: boolean
  creado_en: string
  actualizado_en: string | null
}

/**
 * Laboratorio: órdenes de análisis
 */
export interface OrdenLaboratorio {
  id: string
  tenant_id: string
  consulta_id: string | null
  cliente_id: string
  mascota_id: string
  numero: number
  fecha: string
  estado: 'Solicitada' | 'En Proceso' | 'Completada' | 'Cancelada'
  prioridad: 'Normal' | 'Urgente'
  total: number
  observaciones: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

export interface OrdenLaboratorioItem {
  id: string
  tenant_id: string
  orden_id: string
  estudio_id: string
  precio: number
  resultado: string | null
  valor_numerico: number | null
  unidad: string | null
  fuera_de_rango: boolean | null
  observaciones: string | null
  fecha_resultado: string | null
  creado_en: string
}

/**
 * Recepción: check-in y sala de espera
 */
export interface CheckIn {
  id: string
  tenant_id: string
  turno_id: string | null
  cliente_id: string
  mascota_id: string
  numero: number
  estado: 'En Espera' | 'Llamado' | 'En Atención' | 'Finalizado' | 'Ausente'
  prioridad: 'Normal' | 'Urgente' | 'Emergencia'
  motivo: string | null
  box: string | null
  profesional_id: string | null
  hora_llegada: string
  hora_llamado: string | null
  hora_atencion: string | null
  hora_salida: string | null
  observaciones: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}

/**
 * Ventas (Sales/Transactions)
 * Records products sold during or after consultations
 */
export interface Venta {
  id: string
  tenant_id: string
  consulta_id: string | null
  cliente_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  descuento_porcentaje: number
  descuento_monto: number
  total: number
  metodo_pago: 'Contado' | 'Tarjeta' | 'Transferencia' | 'Cuenta Corriente'
  estado: 'Pendiente' | 'Completada' | 'Cancelada'
  referencia_comprobante: string | null
  observaciones: string | null
  creado_por: string
  creado_en: string
  actualizado_en: string | null
}
