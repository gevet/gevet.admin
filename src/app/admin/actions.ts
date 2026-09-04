'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const inviteUserSchema = z.object({
  email: z.string().email('Email inválido'),
  rolId: z.string().uuid('Rol inválido'),
  sucursalId: z.string().uuid('Sucursal inválida').optional(),
})

const getSupabase = async () => {
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

export async function inviteUser(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = inviteUserSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const supabase = await getSupabase()

    // Obtener información del usuario actual y su tenant
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return { error: 'No autorizado' }
    }

    const { data: currentUser } = await supabase
      .from('gestion_usuarios')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!currentUser) {
      return { error: 'Usuario no encontrado' }
    }

    // Verificar que el usuario tiene permiso para invitar (puede extenderse)
    const { data: permission } = await supabase.rpc('tiene_permiso', {
      permiso: 'usuarios.invitar',
    })

    if (!permission && !(await isAdmin(supabase, currentUser.tenant_id, authUser.id))) {
      return { error: 'No tenés permiso para invitar usuarios' }
    }

    const { email } = parsed.data
    // TODO: Usar rolId y sucursalId cuando se implemente asignación de roles/sucursales

    // Verificar que el email no existe ya en el tenant
    const { data: existingUser } = await supabase
      .from('gestion_usuarios')
      .select('id')
      .eq('tenant_id', currentUser.tenant_id)
      .eq('email', email)
      .single()

    if (existingUser) {
      return { error: 'Este email ya está en el tenant' }
    }

    // Crear invitación (aquí iría integración con email service)
    // Por ahora, solo registramos la intención
    const { error: insertError } = await supabase
      .from('gestion_usuarios')
      .insert({
        tenant_id: currentUser.tenant_id,
        email,
        nombre: email.split('@')[0], // Nombre provisional
        activo: false, // No activo hasta que acepte la invitación
      })

    if (insertError) {
      return { error: 'No pudimos crear la invitación' }
    }

    // TODO: Enviar email de invitación con Resend

    return { success: true }
  } catch {
    return { error: 'Error al procesar la invitación' }
  }
}

async function isAdmin(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { data: user } = await supabase
    .from('gestion_usuarios')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('auth_user_id', userId)
    .single()

  if (!user) return false

  const { data: hasRole } = await supabase
    .from('gestion_usuarios_roles')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('tenant_id', tenantId)
    .limit(1)

  return !!hasRole
}
