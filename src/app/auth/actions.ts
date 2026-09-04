'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { loginSchema, registrationSchema, passwordUpdateSchema, emailSchema } from '@/lib/validators/auth'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiting: 5 intentos por 15 minutos por IP/email
const createRateLimiter = (key: string) => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Fallback: simple in-memory rate limiting (no persiste entre deployments)
    const store = new Map<string, { count: number; resetAt: number }>()
    return {
      limit: async (identifier: string) => {
        const now = Date.now()
        const entry = store.get(`${key}:${identifier}`)

        if (!entry || entry.resetAt < now) {
          store.set(`${key}:${identifier}`, { count: 1, resetAt: now + 15 * 60 * 1000 })
          return { success: true, limit: 5, remaining: 4, reset: now + 15 * 60 * 1000 }
        }

        if (entry.count >= 5) {
          return { success: false, limit: 5, remaining: 0, reset: entry.resetAt }
        }

        entry.count++
        return { success: true, limit: 5, remaining: 5 - entry.count, reset: entry.resetAt }
      }
    }
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
  })

  return ratelimit
}

const loginLimiter = createRateLimiter('auth:login')
const signupLimiter = createRateLimiter('auth:signup')
const recoveryLimiter = createRateLimiter('auth:recovery')

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

export async function signIn(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const { email, password } = parsed.data

  // Rate limiting
  const limiter = await loginLimiter.limit(email)
  if (!limiter.success) {
    const resetIn = Math.ceil((limiter.reset - Date.now()) / 1000)
    return { error: `Demasiados intentos. Intentá de nuevo en ${resetIn} segundos.` }
  }

  try {
    const supabase = await getSupabase()
    const result = await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      // Generic error to prevent user enumeration
      return { error: 'Email o contraseña incorrectos' }
    }

    return { success: true }
  } catch {
    return { error: 'No pudimos completar el ingreso' }
  }
}

export async function signUp(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = registrationSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const { email, password, nombreComercial } = parsed.data

  // Rate limiting
  const limiter = await signupLimiter.limit(email)
  if (!limiter.success) {
    const resetIn = Math.ceil((limiter.reset - Date.now()) / 1000)
    return { error: `Demasiados intentos. Intentá de nuevo en ${resetIn} segundos.` }
  }

  try {
    const supabase = await getSupabase()
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_comercial: nombreComercial },
      },
    })

    if (result.error) {
      // Generic error
      if (result.error.message.includes('already registered')) {
        return { error: 'Este email ya está registrado' }
      }
      return { error: 'No pudimos crear la cuenta' }
    }

    if (!result.data.session) {
      return { success: true }
    }

    return { success: true }
  } catch {
    return { error: 'No pudimos crear la cuenta' }
  }
}

export async function sendPasswordRecovery(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Email inválido' }
  }

  const { email } = parsed.data

  // Rate limiting
  const limiter = await recoveryLimiter.limit(email)
  if (!limiter.success) {
    const resetIn = Math.ceil((limiter.reset - Date.now()) / 1000)
    return { error: `Demasiados intentos. Intentá de nuevo en ${resetIn} segundos.` }
  }

  try {
    const supabase = await getSupabase()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/actualizar-clave`,
    })

    // Always return success (don't confirm if email exists)
    return { success: true }
  } catch {
    return { success: true }
  }
}

export async function updatePassword(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = passwordUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const { password } = parsed.data

  try {
    const supabase = await getSupabase()
    const result = await supabase.auth.updateUser({ password })

    if (result.error) {
      return { error: 'No pudimos actualizar la contraseña' }
    }

    return { success: true }
  } catch {
    return { error: 'No pudimos actualizar la contraseña' }
  }
}

export async function signOut(): Promise<{ error?: string }> {
  try {
    const supabase = await getSupabase()
    const result = await supabase.auth.signOut({ scope: 'global' })

    if (result.error) {
      return { error: 'No pudimos cerrar la sesión' }
    }

    return {}
  } catch {
    return { error: 'No pudimos cerrar la sesión' }
  }
}
