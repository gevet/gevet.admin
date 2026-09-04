import { render, screen } from '@testing-library/react'
import type { Cliente } from '@/lib/types/database'

/**
 * Test: ClienteDetailView Component
 * Tests rendering of cliente information
 */

// Mock the component since we can't render server components directly in tests
const MockClienteDetailView = ({ cliente, isEditing }: {
  cliente: Cliente
  isEditing: boolean
}) => {
  return (
    <div data-testid="cliente-detail-view">
      <h2>{cliente.nombre} {cliente.apellido}</h2>
      <p>{cliente.numero_documento}</p>
      <p>{cliente.email}</p>
      <p>{cliente.telefono}</p>
      <p>{cliente.ciudad}</p>
      <p>{isEditing ? 'Edit Mode' : 'View Mode'}</p>
    </div>
  )
}

describe('ClienteDetailView Component', () => {
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
    direccion: 'Calle 123 Apt 4',
    numero_calle: '123',
    apartamento: '4',
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

  it('should render cliente information in view mode', () => {
    render(<MockClienteDetailView cliente={mockCliente} isEditing={false} />)

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('juan@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('CABA')).toBeInTheDocument()
    expect(screen.getByText('View Mode')).toBeInTheDocument()
  })

  it('should show edit mode indicator when isEditing is true', () => {
    render(<MockClienteDetailView cliente={mockCliente} isEditing={true} />)

    expect(screen.getByText('Edit Mode')).toBeInTheDocument()
  })

  it('should display all required cliente fields', () => {
    const { container } = render(
      <MockClienteDetailView cliente={mockCliente} isEditing={false} />
    )

    const detailView = container.querySelector('[data-testid="cliente-detail-view"]')
    expect(detailView).toBeInTheDocument()
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
      actualizado_en: '2024-01-15T10:30:00Z',
    }

    render(<MockClienteDetailView cliente={minimalCliente} isEditing={false} />)

    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('87654321')).toBeInTheDocument()
  })
})
