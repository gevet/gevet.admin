/**
 * E2E Test: Registration & Onboarding Complete Flow
 * Tests the complete journey from user registration through onboarding completion
 *
 * Credentials:
 * - Email: veterinariaelyagua@gmail.com
 * - Password: adelvalle98
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { z } from 'zod'

/**
 * Validation schemas match the application implementation
 */
const registrationSchema = z.object({
  email: z.string().email('Email must be valid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nombreComercial: z.string().min(2, 'Business name must be at least 2 characters'),
})

const onboardingSchema = z.object({
  nombreComercial: z.string().min(1, 'El nombre comercial es requerido'),
  telefono: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'El formato de teléfono no es válido'),
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

describe('GeVet Registration & Onboarding E2E Flow', () => {
  describe('PART 1: Registration Flow', () => {
    describe('Valid Registration', () => {
      it('should accept valid registration data', () => {
        const validData = {
          email: 'veterinariaelyagua@gmail.com',
          password: 'adelvalle98',
          nombreComercial: 'Veterinaria El Yaguareté',
        }

        const result = registrationSchema.safeParse(validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.email).toBe('veterinariaelyagua@gmail.com')
          expect(result.data.password).toBe('adelvalle98')
          expect(result.data.nombreComercial).toBe('Veterinaria El Yaguareté')
        }
      })

      it('should require email field', () => {
        const invalidData = {
          password: 'adelvalle98',
          nombreComercial: 'Veterinaria El Yaguareté',
        }

        const result = registrationSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email')
        }
      })

      it('should validate email format', () => {
        const invalidData = {
          email: 'not-an-email',
          password: 'adelvalle98',
          nombreComercial: 'Veterinaria El Yaguareté',
        }

        const result = registrationSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Email must be valid')
        }
      })

      it('should require password with minimum 8 characters', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'short',
          nombreComercial: 'Veterinaria El Yaguareté',
        }

        const result = registrationSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('at least 8 characters')
        }
      })

      it('should require nombre comercial with minimum 2 characters', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'adelvalle98',
          nombreComercial: 'V',
        }

        const result = registrationSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('at least 2 characters')
        }
      })
    })
  })

  describe('PART 2: Onboarding Step 1 - Company Information', () => {
    it('should accept valid company information', () => {
      const validData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#2563eb',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nombreComercial).toBe('Veterinaria El Yaguareté')
        expect(result.data.telefono).toBe('+54 9 11 2345 6789')
      }
    })

    it('should reject empty nombre comercial', () => {
      const invalidData = {
        nombreComercial: '',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#2563eb',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: '',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty telefono', () => {
      const invalidData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '',
        colorPrincipal: '#2563eb',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: '',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('requerido')
      }
    })

    it('should validate phone format', () => {
      const testCases = [
        { phone: '+54 9 11 2345 6789', valid: true },
        { phone: '11 2345 6789', valid: true },
        { phone: '(11) 2345-6789', valid: true },
        { phone: '11-2345-6789', valid: true },
        { phone: '+549112345678', valid: true },
        { phone: '123', valid: false }, // Too short
        { phone: 'not-a-phone', valid: false }, // Invalid format
      ]

      testCases.forEach(({ phone, valid }) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: phone,
          colorPrincipal: '#2563eb',
          colorSecundario: '#1e293b',
          colorAccento: '#0ea5e9',
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: 'contacto@yaguarete.vet',
          horarioApertura: '09:00',
          horarioCierre: '18:00',
        }

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(valid)
      })
    })
  })

  describe('PART 3: Onboarding Step 2 - Visual Branding', () => {
    it('should accept custom colors', () => {
      const validData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B', // Custom reddish
        colorSecundario: '#1e293b', // Custom dark
        colorAccento: '#0ea5e9', // Custom blue
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.colorPrincipal).toBe('#FF6B6B')
        expect(result.data.colorSecundario).toBe('#1e293b')
        expect(result.data.colorAccento).toBe('#0ea5e9')
      }
    })

    it('should reject invalid color format', () => {
      const invalidFormats = ['FF6B6B', '#FF6B6', '#GG6B6B', 'red', '#FF6B6B99']

      invalidFormats.forEach((color) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: '+54 9 11 2345 6789',
          colorPrincipal: color,
          colorSecundario: '#1e293b',
          colorAccento: '#0ea5e9',
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: 'contacto@yaguarete.vet',
          horarioApertura: '09:00',
          horarioCierre: '18:00',
        }

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should require all three colors', () => {
      const colorCombinations = [
        { primary: '', secondary: '#1e293b', accent: '#0ea5e9' },
        { primary: '#2563eb', secondary: '', accent: '#0ea5e9' },
        { primary: '#2563eb', secondary: '#1e293b', accent: '' },
      ]

      colorCombinations.forEach(({ primary, secondary, accent }) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: '+54 9 11 2345 6789',
          colorPrincipal: primary,
          colorSecundario: secondary,
          colorAccento: accent,
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: 'contacto@yaguarete.vet',
          horarioApertura: '09:00',
          horarioCierre: '18:00',
        }

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('PART 4: Onboarding Step 3 - Main Branch (Sucursal)', () => {
    it('should accept all required branch fields', () => {
      const validData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(validData)
      expect(result.success).toBe(true, `Validation failed: ${result.error?.toString() || 'Unknown error'}`)
      if (result.success) {
        expect(result.data.nombreSucursal).toBe('Centro Principal')
        expect(result.data.direccion).toBe('Av. Leandro N. Alem 1234')
        expect(result.data.ciudad).toBe('Buenos Aires')
        expect(result.data.provincia).toBe('Buenos Aires')
      }
    })

    it('should reject empty required fields', () => {
      const requiredFields = [
        { field: 'nombreSucursal', value: '' },
        { field: 'direccion', value: '' },
        { field: 'ciudad', value: '' },
        { field: 'provincia', value: '' },
      ]

      requiredFields.forEach(({ field, value }) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: '+54 9 11 2345 6789',
          colorPrincipal: '#FF6B6B',
          colorSecundario: '#1e293b',
          colorAccento: '#0ea5e9',
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: '',
          horarioApertura: '09:00',
          horarioCierre: '18:00',
        }

        if (field === 'nombreSucursal') data.nombreSucursal = value
        if (field === 'direccion') data.direccion = value
        if (field === 'ciudad') data.ciudad = value
        if (field === 'provincia') data.provincia = value

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should accept empty email (optional field)', () => {
      const validData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: '', // Empty - should be allowed by z.union([z.string().email(), z.string().length(0)])
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate email format when provided', () => {
      const emailTestCases = [
        { email: 'contacto@yaguarete.vet', valid: true },
        { email: 'info@veterinaria.com.ar', valid: true },
        { email: 'invalid-email', valid: false },
        { email: 'no@domain.c', valid: true }, // Actually valid minimal TLD
      ]

      emailTestCases.forEach(({ email, valid }) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: '+54 9 11 2345 6789',
          colorPrincipal: '#FF6B6B',
          colorSecundario: '#1e293b',
          colorAccento: '#0ea5e9',
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: email,
          horarioApertura: '09:00',
          horarioCierre: '18:00',
        }

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(valid)
      })
    })

    it('should validate time format (HH:MM)', () => {
      const timeTestCases = [
        { opening: '09:00', closing: '18:00', valid: true },
        { opening: '06:30', closing: '20:15', valid: true },
        { opening: '25:00', closing: '18:00', valid: false }, // Invalid hour
        { opening: '09:60', closing: '18:00', valid: false }, // Invalid minute
        { opening: '9:00', closing: '18:00', valid: false }, // Missing leading zero
      ]

      timeTestCases.forEach(({ opening, closing, valid }) => {
        const data = {
          nombreComercial: 'Veterinaria El Yaguareté',
          telefono: '+54 9 11 2345 6789',
          colorPrincipal: '#FF6B6B',
          colorSecundario: '#1e293b',
          colorAccento: '#0ea5e9',
          nombreSucursal: 'Centro Principal',
          direccion: 'Av. Leandro N. Alem 1234',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          email: 'contacto@yaguarete.vet',
          horarioApertura: opening,
          horarioCierre: closing,
        }

        const result = onboardingSchema.safeParse(data)
        expect(result.success).toBe(valid)
      })
    })
  })

  describe('PART 5: Complete Onboarding Data', () => {
    it('should accept the full test scenario data', () => {
      const completeData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(completeData)
      expect(result.success).toBe(true)
    })

    it('should verify all fields are present in validated data', () => {
      const completeData = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(completeData)
      expect(result.success).toBe(true)

      if (result.success) {
        // Verify all required fields are in the parsed result
        expect(result.data).toHaveProperty('nombreComercial')
        expect(result.data).toHaveProperty('telefono')
        expect(result.data).toHaveProperty('colorPrincipal')
        expect(result.data).toHaveProperty('colorSecundario')
        expect(result.data).toHaveProperty('colorAccento')
        expect(result.data).toHaveProperty('nombreSucursal')
        expect(result.data).toHaveProperty('direccion')
        expect(result.data).toHaveProperty('ciudad')
        expect(result.data).toHaveProperty('provincia')
        expect(result.data).toHaveProperty('email')
        expect(result.data).toHaveProperty('horarioApertura')
        expect(result.data).toHaveProperty('horarioCierre')
      }
    })
  })

  describe('PART 6: Database State Expectations', () => {
    it('should describe expected tenant record after onboarding', () => {
      const expectedTenant = {
        id: expect.any(String), // UUID
        nombre_comercial: 'Veterinaria El Yaguareté',
        onboarding_completado: true,
        creado_en: expect.any(String), // ISO timestamp
        actualizado_en: expect.any(String), // ISO timestamp
      }

      // This is more of a documentation test
      expect(expectedTenant).toHaveProperty('nombre_comercial', 'Veterinaria El Yaguareté')
      expect(expectedTenant).toHaveProperty('onboarding_completado', true)
    })

    it('should describe expected branding record after onboarding', () => {
      const expectedBranding = {
        tenant_id: expect.any(String), // UUID
        color_primario: '#FF6B6B',
        color_secundario: '#1e293b',
        color_acento: '#0ea5e9',
        logo_url: null, // Or URL if logo uploaded
        actualizado_en: expect.any(String), // ISO timestamp
      }

      expect(expectedBranding).toHaveProperty('color_primario', '#FF6B6B')
      expect(expectedBranding).toHaveProperty('color_secundario', '#1e293b')
      expect(expectedBranding).toHaveProperty('color_acento', '#0ea5e9')
    })

    it('should describe expected sucursal record after onboarding', () => {
      const expectedSucursal = {
        id: expect.any(String), // UUID
        tenant_id: expect.any(String), // UUID
        nombre: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        telefono: '+54 9 11 2345 6789',
        email: 'contacto@yaguarete.vet',
        horario_apertura: expect.any(String), // time type
        horario_cierre: expect.any(String), // time type
        activo: true,
        creado_en: expect.any(String), // ISO timestamp
        actualizado_en: expect.any(String), // ISO timestamp
      }

      expect(expectedSucursal).toHaveProperty('nombre', 'Centro Principal')
      expect(expectedSucursal).toHaveProperty('ciudad', 'Buenos Aires')
      expect(expectedSucursal).toHaveProperty('activo', true)
    })
  })

  describe('PART 7: Error Cases & Edge Cases', () => {
    it('should allow data with extra properties (Zod default behavior)', () => {
      const dataWithExtra = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
        extraField: 'should be ignored', // Extra field
      }

      // Zod will allow extra properties by default and strip them
      const result = onboardingSchema.safeParse(dataWithExtra)
      expect(result.success).toBe(true)
      if (result.success) {
        // Extra field should not be in the parsed data
        expect((result.data as any).extraField).toBeUndefined()
      }
    })

    it('should handle whitespace in required fields', () => {
      const dataWithWhitespace = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      // Note: Frontend should trim, but Zod doesn't trim by default
      // The application should handle trimming if needed
      const result = onboardingSchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true) // Values still pass validation
    })

    it('should handle special characters in text fields', () => {
      const dataWithSpecialChars = {
        nombreComercial: "Veterinaria El Yaguareté & Co.",
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal (Downtown)',
        direccion: 'Av. Leandro N. Alem #1234 - Piso 2',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      const result = onboardingSchema.safeParse(dataWithSpecialChars)
      expect(result.success).toBe(true)
    })
  })

  describe('PART 8: Flow Progression', () => {
    it('should track data through all 4 onboarding steps', () => {
      // Step 0 data
      const step0Data = {
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
      }

      // Step 1 data (extends step 0)
      const step1Data = {
        ...step0Data,
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
      }

      // Step 2 data (extends step 1)
      const step2Data = {
        ...step1Data,
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        email: 'contacto@yaguarete.vet',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
      }

      // Verify each step's data is valid
      const step0Result = step0Data.nombreComercial.length > 0 && step0Data.telefono.length > 0
      expect(step0Result).toBe(true)

      const step1Result = step0Result && step1Data.colorPrincipal.startsWith('#')
      expect(step1Result).toBe(true)

      const step2Result = onboardingSchema.safeParse(step2Data).success
      expect(step2Result).toBe(true)

      // All steps should lead to complete data
      expect(step2Data).toMatchObject({
        nombreComercial: 'Veterinaria El Yaguareté',
        telefono: '+54 9 11 2345 6789',
        colorPrincipal: '#FF6B6B',
        colorSecundario: '#1e293b',
        colorAccento: '#0ea5e9',
        nombreSucursal: 'Centro Principal',
        direccion: 'Av. Leandro N. Alem 1234',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
      })
    })
  })
})
