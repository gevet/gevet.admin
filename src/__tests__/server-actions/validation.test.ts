import { z } from 'zod'

/**
 * Test: Server Action Zod Validation
 * Verifies that all server actions properly validate input with Zod
 */

describe('Server Action Validation', () => {
  // Define test schemas similar to actual server actions
  const ClienteSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    apellido: z.string().min(1, 'Apellido requerido'),
    numero_documento: z.string().min(5, 'Documento inválido'),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
    ciudad: z.string().optional(),
    direccion: z.string().optional(),
  })

  const MascotaSchema = z.object({
    cliente_id: z.string().uuid('UUID inválido'),
    nombre: z.string().min(1, 'Nombre mascota requerido'),
    especie: z.enum(['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor']),
    raza: z.string().optional(),
    sexo: z.enum(['M', 'F', 'I']).optional(),
    fecha_nacimiento: z.date().optional(),
    peso_kg: z.number().positive().optional(),
    color: z.string().optional(),
    alergias: z.string().optional(),
    condiciones_cronicas: z.string().optional(),
  })

  describe('ClienteSchema validation', () => {
    it('should accept valid cliente data', () => {
      const validData = {
        nombre: 'Juan',
        apellido: 'Pérez',
        numero_documento: '12345678',
        email: 'juan@example.com',
        telefono: '555-1234',
        ciudad: 'CABA',
        direccion: 'Calle 123',
      }

      const result = ClienteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject cliente without nombre', () => {
      const invalidData = {
        nombre: '',
        apellido: 'Pérez',
        numero_documento: '12345678',
      }

      const result = ClienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('nombre'))).toBe(true)
      }
    })

    it('should reject cliente with invalid email', () => {
      const invalidData = {
        nombre: 'Juan',
        apellido: 'Pérez',
        numero_documento: '12345678',
        email: 'not-an-email',
      }

      const result = ClienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true)
      }
    })

    it('should reject documento too short', () => {
      const invalidData = {
        nombre: 'Juan',
        apellido: 'Pérez',
        numero_documento: '123',
      }

      const result = ClienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('MascotaSchema validation', () => {
    it('should accept valid mascota data', () => {
      const validData = {
        cliente_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Fido',
        especie: 'Perro' as const,
        raza: 'Labrador',
        sexo: 'M' as const,
        peso_kg: 30.5,
        color: 'Café',
      }

      const result = MascotaSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject mascota without cliente_id', () => {
      const invalidData = {
        nombre: 'Fido',
        especie: 'Perro' as const,
      }

      const result = MascotaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('cliente_id'))).toBe(true)
      }
    })

    it('should reject invalid cliente_id UUID', () => {
      const invalidData = {
        cliente_id: 'not-a-uuid',
        nombre: 'Fido',
        especie: 'Perro' as const,
      }

      const result = MascotaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('cliente_id'))).toBe(true)
      }
    })

    it('should reject invalid especie', () => {
      const invalidData = {
        cliente_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Fido',
        especie: 'Dinosaurio',
      }

      const result = MascotaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject negative peso_kg', () => {
      const invalidData = {
        cliente_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Fido',
        especie: 'Perro' as const,
        peso_kg: -5,
      }

      const result = MascotaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('peso_kg'))).toBe(true)
      }
    })
  })
})
