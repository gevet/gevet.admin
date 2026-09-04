import { z } from 'zod'

/**
 * Validation schemas shared by the onboarding server action and its tests,
 * so the tests exercise the same rules the application enforces.
 */

const TELEFONO_CARACTERES = /^\+?[\d\s().-]+$/
const MIN_DIGITOS_TELEFONO = 8
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

export const registrationSchema = z.object({
  email: z.string().email('Email must be valid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nombreComercial: z.string().min(2, 'Business name must be at least 2 characters'),
})

export const onboardingSchema = z.object({
  nombreComercial: z.string().min(1, 'El nombre comercial es requerido'),
  telefono: z
    .string()
    .min(1, 'El teléfono es requerido')
    // Accepts the shapes people actually type: +54 9 11 2345 6789, (11) 2345-6789,
    // 11-2345-6789, +549112345678 — while rejecting text and too-short numbers.
    .refine((valor) => TELEFONO_CARACTERES.test(valor), 'El formato de teléfono no es válido')
    .refine(
      (valor) => valor.replace(/\D/g, '').length >= MIN_DIGITOS_TELEFONO,
      'El formato de teléfono no es válido',
    ),
  colorPrincipal: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color primario inválido'),
  colorSecundario: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color secundario inválido'),
  colorAccento: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color acento inválido'),
  nombreSucursal: z.string().min(1, 'El nombre de la sucursal es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  ciudad: z.string().min(1, 'La ciudad es requerida'),
  provincia: z.string().min(1, 'La provincia es requerida'),
  email: z.union([z.string().email('Email inválido'), z.string().length(0)]),
  // Must be a real clock time: the sucursales columns are Postgres `time`, so
  // something like "25:00" would only fail later, as an opaque insert error.
  horarioApertura: z.string().regex(HORA_VALIDA, 'Formato de hora inválido'),
  horarioCierre: z.string().regex(HORA_VALIDA, 'Formato de hora inválido'),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
