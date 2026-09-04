/**
 * Database access utilities for GeVet multi-tenant system
 * All functions respect Row Level Security (RLS) policies
 *
 * Usage: Import in server actions to access database with tenant isolation
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  Cliente,
  Mascota,
  Turno,
  Consulta,
  Rol,
  Sucursal,
  GestionUsuario,
  Tenant,
  DbContext,
} from '@/lib/types/database'

export const getSupabase = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookieList: Array<{ name: string; value: string; options: { [key: string]: unknown } }>) => {
          cookieList.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

/**
 * Get database context (tenant_id, user_id) from authenticated session
 */
export async function getDbContext(): Promise<DbContext | null> {
  const supabase = await getSupabase()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: usuario } = await supabase
    .from('gestion_usuarios')
    .select('id, tenant_id, email')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!usuario) return null

  return {
    tenant_id: usuario.tenant_id,
    user_id: usuario.id,
    user_email: usuario.email,
  }
}

/**
 * CLIENTES
 */
export async function crearCliente(data: Omit<Cliente, 'id' | 'tenant_id' | 'creado_por' | 'creado_en' | 'actualizado_en'>): Promise<Cliente | null> {
  const context = await getDbContext()
  if (!context) return null

  const supabase = await getSupabase()

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      ...data,
      tenant_id: context.tenant_id,
      creado_por: context.user_id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating cliente:', error)
    return null
  }

  return cliente as Cliente
}

export async function obtenerCliente(clienteId: string): Promise<Cliente | null> {
  const supabase = await getSupabase()

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select()
    .eq('id', clienteId)
    .single()

  if (error) return null
  return cliente as Cliente
}

export async function listarClientes(filtros?: { activo?: boolean; ciudad?: string }): Promise<Cliente[]> {
  const supabase = await getSupabase()

  let query = supabase.from('clientes').select()

  if (filtros?.activo !== undefined) {
    query = query.eq('activo', filtros.activo)
  }

  if (filtros?.ciudad) {
    query = query.eq('ciudad', filtros.ciudad)
  }

  const { data: clientes, error } = await query

  if (error) {
    console.error('Error listing clientes:', error)
    return []
  }

  return (clientes || []) as Cliente[]
}

export async function actualizarCliente(clienteId: string, datos: Partial<Cliente>): Promise<Cliente | null> {
  const supabase = await getSupabase()

  const { id, tenant_id, creado_por, creado_en, ...updateData } = datos

  const { data: cliente, error } = await supabase
    .from('clientes')
    .update(updateData)
    .eq('id', clienteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating cliente:', error)
    return null
  }

  return cliente as Cliente
}

/**
 * MASCOTAS
 */
export async function crearMascota(data: Omit<Mascota, 'id' | 'tenant_id' | 'creado_por' | 'creado_en' | 'actualizado_en'>): Promise<Mascota | null> {
  const context = await getDbContext()
  if (!context) return null

  const supabase = await getSupabase()

  const { data: mascota, error } = await supabase
    .from('mascotas')
    .insert({
      ...data,
      tenant_id: context.tenant_id,
      creado_por: context.user_id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating mascota:', error)
    return null
  }

  return mascota as Mascota
}

export async function obtenerMascota(mascotaId: string): Promise<Mascota | null> {
  const supabase = await getSupabase()

  const { data: mascota, error } = await supabase
    .from('mascotas')
    .select()
    .eq('id', mascotaId)
    .single()

  if (error) return null
  return mascota as Mascota
}

export async function listarMascotasPorCliente(clienteId: string): Promise<Mascota[]> {
  const supabase = await getSupabase()

  const { data: mascotas, error } = await supabase
    .from('mascotas')
    .select()
    .eq('cliente_id', clienteId)
    .eq('activo', true)
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error listing mascotas:', error)
    return []
  }

  return (mascotas || []) as Mascota[]
}

/**
 * TURNOS
 */
export async function crearTurno(data: Omit<Turno, 'id' | 'tenant_id' | 'creado_por' | 'creado_en' | 'actualizado_en'>): Promise<Turno | null> {
  const context = await getDbContext()
  if (!context) return null

  const supabase = await getSupabase()

  const { data: turno, error } = await supabase
    .from('turnos')
    .insert({
      ...data,
      tenant_id: context.tenant_id,
      creado_por: context.user_id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating turno:', error)
    return null
  }

  return turno as Turno
}

export async function listarTurnosPorFecha(fecha: string): Promise<Turno[]> {
  const supabase = await getSupabase()

  const inicio = new Date(fecha)
  const fin = new Date(fecha)
  fin.setDate(fin.getDate() + 1)

  const { data: turnos, error } = await supabase
    .from('turnos')
    .select()
    .gte('fecha_hora', inicio.toISOString())
    .lt('fecha_hora', fin.toISOString())
    .order('fecha_hora', { ascending: true })

  if (error) {
    console.error('Error listing turnos:', error)
    return []
  }

  return (turnos || []) as Turno[]
}

export async function actualizarEstadoTurno(turnoId: string, nuevoEstado: Turno['estado'], razonCancelacion?: string): Promise<Turno | null> {
  const supabase = await getSupabase()

  const updateData: any = { estado: nuevoEstado }
  if (razonCancelacion) {
    updateData.razon_cancelacion = razonCancelacion
  }

  const { data: turno, error } = await supabase
    .from('turnos')
    .update(updateData)
    .eq('id', turnoId)
    .select()
    .single()

  if (error) {
    console.error('Error updating turno:', error)
    return null
  }

  return turno as Turno
}

/**
 * CONSULTAS
 */
export async function crearConsulta(data: Omit<Consulta, 'id' | 'tenant_id' | 'creado_por' | 'creado_en' | 'actualizado_en'>): Promise<Consulta | null> {
  const context = await getDbContext()
  if (!context) return null

  const supabase = await getSupabase()

  const { data: consulta, error } = await supabase
    .from('consultas')
    .insert({
      ...data,
      tenant_id: context.tenant_id,
      creado_por: context.user_id,
      profesional_id: context.user_id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating consulta:', error)
    return null
  }

  return consulta as Consulta
}

export async function obtenerConsulta(consultaId: string): Promise<Consulta | null> {
  const supabase = await getSupabase()

  const { data: consulta, error } = await supabase
    .from('consultas')
    .select()
    .eq('id', consultaId)
    .single()

  if (error) return null
  return consulta as Consulta
}

export async function listarConsultasPorMascota(mascotaId: string): Promise<Consulta[]> {
  const supabase = await getSupabase()

  const { data: consultas, error } = await supabase
    .from('consultas')
    .select()
    .eq('mascota_id', mascotaId)
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error listing consultas:', error)
    return []
  }

  return (consultas || []) as Consulta[]
}

/**
 * ROLES Y PERMISOS
 */
export async function listarRoles(): Promise<Rol[]> {
  const supabase = await getSupabase()

  const { data: roles, error } = await supabase
    .from('roles')
    .select()
    .eq('activo', true)
    .order('nombre')

  if (error) {
    console.error('Error listing roles:', error)
    return []
  }

  return (roles || []) as Rol[]
}

/**
 * TENANT
 */
export async function obtenerTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = await getSupabase()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select()
    .eq('id', tenantId)
    .single()

  if (error) return null
  return tenant as Tenant
}
