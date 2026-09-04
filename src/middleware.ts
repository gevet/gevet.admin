import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.redirect(new URL('/login?error=configuracion', request.url))
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: CookieToSet[]) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?retorno=${encodeURIComponent(request.nextUrl.pathname)}`, request.url)
    )
  }

  // Obtener información del usuario y su tenant
  const { data: userData } = await supabase
    .from('gestion_usuarios')
    .select('id, activo, tenant_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!userData || !userData.activo) {
    await supabase.auth.signOut({ scope: 'global' })
    return NextResponse.redirect(new URL('/login?error=usuario_inactivo', request.url))
  }

  // Validar estado del tenant
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id, estado, onboarding_completado, trial_termina_en')
    .eq('id', userData.tenant_id)
    .single()

  if (!tenantData) {
    await supabase.auth.signOut({ scope: 'global' })
    return NextResponse.redirect(new URL('/login?error=tenant_no_encontrado', request.url))
  }

  // Verificar si el tenant está suspendido o cancelado
  if (tenantData.estado === 'suspendido' || tenantData.estado === 'cancelado') {
    await supabase.auth.signOut({ scope: 'global' })
    const reason =
      tenantData.estado === 'suspendido' ? 'tenant_suspendido' : 'tenant_cancelado'
    return NextResponse.redirect(new URL(`/login?error=${reason}`, request.url))
  }

  // Verificar si el trial ha vencido
  if (tenantData.estado === 'trial') {
    const trialEnd = new Date(tenantData.trial_termina_en).getTime()
    if (Date.now() > trialEnd) {
      return NextResponse.redirect(new URL('/trial-vencido', request.url))
    }
  }

  // Redirigir a onboarding si no está completado (excepto en onboarding)
  if (!tenantData.onboarding_completado && !request.nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Si está en onboarding y ya completó, redirigir al dashboard
  if (tenantData.onboarding_completado && request.nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

export const config = { matcher: ['/admin/:path*', '/onboarding', '/actualizar-clave'] }
