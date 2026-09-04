'use server'

import { createClient } from '@/lib/supabase/server'
import { getDbContext } from '@/lib/db'
import { z } from 'zod'

const onboardingSchema = z.object({
  nombreComercial: z.string().min(1, 'El nombre comercial es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  colorPrincipal: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color inválido'),
  nombreSucursal: z.string().min(1, 'El nombre de la sucursal es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
})

type OnboardingData = z.infer<typeof onboardingSchema>

export async function completarOnboardingAction(data: OnboardingData) {
  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const validated = onboardingSchema.parse(data)
    const supabase = await createClient()
    const tenant_id = context.tenant_id

    // Update tenant with nombre comercial and mark onboarding as complete
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        nombre_comercial: validated.nombreComercial,
        onboarding_completado: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', tenant_id)

    if (tenantError) {
      console.error('Error updating tenant:', tenantError)
      return { error: 'Error al guardar la información de la veterinaria' }
    }

    // Create or update tenant branding
    const { error: brandingError } = await supabase
      .from('tenant_branding')
      .upsert(
        {
          tenant_id,
          color_primario: validated.colorPrincipal,
          color_secundario: '#1e293b',
          color_acento: '#0ea5e9',
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' },
      )

    if (brandingError) {
      console.error('Error updating branding:', brandingError)
      return { error: 'Error al guardar la identidad visual' }
    }

    // Create main branch (sucursal)
    const { error: sucursalError } = await supabase.from('sucursales').insert({
      tenant_id,
      nombre: validated.nombreSucursal,
      direccion: validated.direccion,
      telefono: validated.telefono,
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })

    if (sucursalError) {
      console.error('Error creating branch:', sucursalError)
      return { error: 'Error al crear la sucursal principal' }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Onboarding error:', error)
    return { error: 'Error al completar el onboarding' }
  }
}
