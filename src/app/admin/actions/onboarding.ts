'use server'

import { createClient } from '@/lib/supabase/server'
import { getDbContext } from '@/lib/db'
import { z } from 'zod'

const onboardingSchema = z.object({
  nombreComercial: z.string().min(1, 'El nombre comercial es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  colorPrincipal: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color primario inválido'),
  colorSecundario: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color secundario inválido'),
  colorAccento: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color acento inválido'),
  nombreSucursal: z.string().min(1, 'El nombre de la sucursal es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  ciudad: z.string().min(1, 'La ciudad es requerida'),
  provincia: z.string().min(1, 'La provincia es requerida'),
  email: z.union([z.string().email('Email inválido'), z.string().length(0)]),
  horarioApertura: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  horarioCierre: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
})

export async function completarOnboardingAction(formData: FormData) {
  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const supabase = await createClient()
    const tenant_id = context.tenant_id

    const data = {
      nombreComercial: formData.get('nombreComercial') as string,
      telefono: formData.get('telefono') as string,
      colorPrincipal: formData.get('colorPrincipal') as string,
      colorSecundario: formData.get('colorSecundario') as string,
      colorAccento: formData.get('colorAccento') as string,
      nombreSucursal: formData.get('nombreSucursal') as string,
      direccion: formData.get('direccion') as string,
      ciudad: formData.get('ciudad') as string,
      provincia: formData.get('provincia') as string,
      email: formData.get('email') as string,
      horarioApertura: formData.get('horarioApertura') as string,
      horarioCierre: formData.get('horarioCierre') as string,
    }

    const validated = onboardingSchema.parse(data)
    const logoFile = formData.get('logo') as File | null

    let logoUrl: string | null = null

    // Upload logo to Supabase Storage if provided
    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split('.').pop() || 'png'
      const fileName = `${tenant_id}-${Date.now()}.${ext}`
      const filePath = `${tenant_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Error uploading logo:', uploadError)
        return { error: 'Error al guardar el logo' }
      }

      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      logoUrl = publicUrlData.publicUrl
    }

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
          color_secundario: validated.colorSecundario,
          color_acento: validated.colorAccento,
          logo_url: logoUrl,
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
      ciudad: validated.ciudad,
      provincia: validated.provincia,
      telefono: validated.telefono,
      email: validated.email,
      horario_apertura: validated.horarioApertura,
      horario_cierre: validated.horarioCierre,
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })

    if (sucursalError) {
      console.error('Error creating branch:', sucursalError)
      return { error: 'Error al crear la sucursal principal' }
    }

    return { success: true, logoUrl }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Onboarding error:', error)
    return { error: 'Error al completar el onboarding' }
  }
}
