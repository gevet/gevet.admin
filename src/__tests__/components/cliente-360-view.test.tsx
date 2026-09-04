import { render, screen } from '@testing-library/react'
import { Cliente360View } from '@/components/admin/clientes/cliente-360-view'
import type { Cliente } from '@/lib/types/database'

/**
 * Test: Cliente360View Component
 * Tests 360° history view with unified timeline
 */

const mockCliente: Cliente = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  tenant_id: '550e8400-e29b-41d4-a716-446655440001',
  tipo_documento: 'DNI',
  numero_documento: '12345678',
  nombre: 'Juan',
  apellido: 'Pérez',
  razon_social: null,
  email: 'juan@example.com',
  telefono: '555-1234',
  celular: null,
  direccion: 'Calle 123',
  numero_calle: '123',
  apartamento: null,
  ciudad: 'CABA',
  provincia: null,
  codigo_postal: '1425',
  pais: 'Argentina',
  responsable_iva: true,
  condicion_iva: 'Responsable Inscripto',
  observaciones: 'Cliente VIP',
  activo: true,
  creado_por: 'user123',
  creado_en: '2024-01-15T10:30:00Z',
  actualizado_en: '2024-01-15T10:30:00Z',
}

describe('Cliente360View Component', () => {
  it('should render cliente information', () => {
    const data = {
      cliente: mockCliente,
      mascotas: [],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('juan@example.com')).toBeInTheDocument()
  })

  it('should display statistics cards', () => {
    const data = {
      cliente: mockCliente,
      mascotas: [
        {
          id: 'mascota1',
          nombre: 'Fido',
          especie: 'Perro',
          raza: 'Labrador',
        },
      ],
      turnos: [
        {
          id: 'turno1',
          fecha_hora: '2024-02-01T10:00:00Z',
          motivo: 'Consulta general',
        },
      ],
      consultas: [
        {
          id: 'consulta1',
          creado_en: '2024-02-01T10:30:00Z',
          evaluacion: 'Paciente en buen estado',
        },
      ],
    }

    render(<Cliente360View data={data} />)

    // Check stats cards exist with their labels
    expect(screen.getAllByText('Mascotas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Turnos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Consultas').length).toBeGreaterThan(0)
    // Verify timeline section exists
    expect(screen.getByText('Historial Completo')).toBeInTheDocument()
  })

  it('should display empty state when no data', () => {
    const data = {
      cliente: mockCliente,
      mascotas: [],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    expect(screen.getByText('No hay información adicional disponible')).toBeInTheDocument()
  })

  it('should display mascotas section', () => {
    const data = {
      cliente: mockCliente,
      mascotas: [
        {
          id: 'mascota1',
          nombre: 'Fido',
          especie: 'Perro',
          raza: 'Labrador',
        },
        {
          id: 'mascota2',
          nombre: 'Misi',
          especie: 'Gato',
          raza: null,
        },
      ],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    // Check mascotas are displayed
    expect(screen.getByText('Fido (Perro)')).toBeInTheDocument()
    expect(screen.getByText('Misi (Gato)')).toBeInTheDocument()
  })

  it('should display observation notes', () => {
    const data = {
      cliente: mockCliente,
      mascotas: [],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    expect(screen.getByText('Cliente VIP')).toBeInTheDocument()
  })

  it('should display contact information', () => {
    const data = {
      cliente: {
        ...mockCliente,
        city: 'Buenos Aires',
      },
      mascotas: [],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    expect(screen.getByText('CABA')).toBeInTheDocument()
  })

  it('should handle cliente with minimal information', () => {
    const minimalCliente: Cliente = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      tipo_documento: 'DNI',
      numero_documento: '87654321',
      nombre: 'Ana',
      apellido: 'García',
      razon_social: null,
      email: null,
      telefono: null,
      celular: null,
      direccion: null,
      numero_calle: null,
      apartamento: null,
      ciudad: null,
      provincia: null,
      codigo_postal: null,
      pais: 'Argentina',
      responsable_iva: false,
      condicion_iva: null,
      observaciones: null,
      activo: true,
      creado_por: 'user123',
      creado_en: '2024-01-15T10:30:00Z',
      actualizado_en: null,
    }

    const data = {
      cliente: minimalCliente,
      mascotas: [],
      turnos: [],
      consultas: [],
    }

    render(<Cliente360View data={data} />)

    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('87654321')).toBeInTheDocument()
  })
})
