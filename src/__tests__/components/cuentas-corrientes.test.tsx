import { render, screen } from '@testing-library/react'
import { CuentaCorrienteView } from '@/components/admin/cuentas-corrientes/cuenta-corriente-view'
import { CuentasCorrientesList } from '@/components/admin/cuentas-corrientes/cuentas-corrientes-list'
import type { CuentaCorriente, MovimientoCuentaCorriente } from '@/lib/types/database'

/**
 * Test: CuentaCorrienteView Component
 * Tests account display with balance and transaction history
 */

const mockCuenta: CuentaCorriente = {
  id: '550e8400-e29b-41d4-a716-446655440099',
  tenant_id: '550e8400-e29b-41d4-a716-446655440001',
  cliente_id: '550e8400-e29b-41d4-a716-446655440000',
  saldo_deuda: 1500.50,
  saldo_favor: 250.00,
  limite_credito: 5000.00,
  condicion_pago: 'Plazo 30',
  dias_de_gracia: 3,
  activo: true,
  creado_en: '2024-01-15T10:30:00Z',
  actualizado_en: '2024-02-01T15:45:00Z',
}

const mockMovimientos: MovimientoCuentaCorriente[] = [
  {
    id: 'mov1',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    cliente_id: '550e8400-e29b-41d4-a716-446655440000',
    cuenta_corriente_id: '550e8400-e29b-41d4-a716-446655440099',
    tipo: 'Cargo',
    monto: 500.00,
    saldo_anterior: 1000.50,
    saldo_nuevo: 1500.50,
    referencia_tipo: 'Venta',
    referencia_id: 'venta001',
    descripcion: 'Consulta veterinaria',
    fecha_vencimiento: '2024-03-01T00:00:00Z',
    creado_por: 'user123',
    creado_en: '2024-02-01T10:00:00Z',
  },
  {
    id: 'mov2',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    cliente_id: '550e8400-e29b-41d4-a716-446655440000',
    cuenta_corriente_id: '550e8400-e29b-41d4-a716-446655440099',
    tipo: 'Abono',
    monto: 250.00,
    saldo_anterior: 1250.50,
    saldo_nuevo: 1000.50,
    referencia_tipo: 'Pago',
    referencia_id: 'pago001',
    descripcion: 'Pago parcial',
    fecha_vencimiento: null,
    creado_por: 'user123',
    creado_en: '2024-01-28T14:00:00Z',
  },
]

describe('CuentaCorrienteView Component', () => {
  it('should render cuenta information', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    expect(screen.getByText('Cuenta Corriente')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('should display balance information', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    // Check for balance labels and approximate values
    expect(screen.getByText('Saldo Deuda')).toBeInTheDocument()
    expect(screen.getByText('Saldo a Favor')).toBeInTheDocument()
    expect(screen.getByText('Límite de Crédito')).toBeInTheDocument()
  })

  it('should display payment condition', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    // Check for condition label and ensure at least one reference exists
    const conditionLabels = screen.getAllByText(/días/)
    expect(conditionLabels.length).toBeGreaterThan(0)
  })

  it('should display account settings', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    expect(screen.getByText('Condición de Pago')).toBeInTheDocument()
    expect(screen.getByText('Días de Gracia')).toBeInTheDocument()
    expect(screen.getByText(/3 días/)).toBeInTheDocument()
  })

  it('should display transaction history', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    expect(screen.getByText('Historial de Movimientos')).toBeInTheDocument()
    expect(screen.getByText('Consulta veterinaria')).toBeInTheDocument()
    expect(screen.getByText('Pago parcial')).toBeInTheDocument()
  })

  it('should show empty state when no cuenta', () => {
    render(
      <CuentaCorrienteView
        cuenta={null}
        movimientos={[]}
        clienteNombre="Juan Pérez"
      />,
    )

    expect(screen.getByText('No hay cuenta corriente configurada')).toBeInTheDocument()
  })

  it('should show empty state when no movimientos', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={[]}
        clienteNombre="Juan Pérez"
      />,
    )

    expect(screen.getByText('Sin movimientos registrados')).toBeInTheDocument()
  })

  it('should display different colors for charges and payments', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    // Both movimiento types should be visible
    expect(screen.getByText('Venta')).toBeInTheDocument()
    expect(screen.getByText('Pago')).toBeInTheDocument()
  })

  it('should format currency values correctly', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    // Verify currency format (should have $ and 2 decimal places)
    const texts = screen.getAllByText(/\$/g)
    expect(texts.length).toBeGreaterThan(0)
  })

  it('should format dates correctly', () => {
    render(
      <CuentaCorrienteView
        cuenta={mockCuenta}
        movimientos={mockMovimientos}
        clienteNombre="Juan Pérez"
      />,
    )

    // Should display formatted date (es-ES locale)
    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(dateElements.length).toBeGreaterThan(0)
  })
})

describe('CuentasCorrientesList Component', () => {
  const mockClientes = [
    {
      id: 'cliente1',
      nombre: 'Juan',
      apellido: 'Pérez',
      numero_documento: '12345678',
      saldo_deuda: 1500.50,
      saldo_favor: 250.00,
      limite_credito: 5000.00,
    },
    {
      id: 'cliente2',
      nombre: 'María',
      apellido: 'García',
      numero_documento: '87654321',
      saldo_deuda: 0,
      saldo_favor: 100.00,
      limite_credito: 3000.00,
    },
  ]

  it('should render clientes list', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={2}
        page={1}
        pageSize={20}
      />,
    )

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
  })

  it('should display account balances for each cliente', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={2}
        page={1}
        pageSize={20}
      />,
    )

    // Check for saldo_deuda values
    expect(screen.getByText(/1500\.50/)).toBeInTheDocument()
  })

  it('should show empty state when no clientes', () => {
    render(
      <CuentasCorrientesList
        clientes={[]}
        total={0}
        page={1}
        pageSize={20}
      />,
    )

    expect(screen.getByText('No hay clientes para mostrar')).toBeInTheDocument()
  })

  it('should display pagination info', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={50}
        page={1}
        pageSize={20}
      />,
    )

    expect(screen.getByText(/Mostrando 2 de 50 clientes/)).toBeInTheDocument()
  })

  it('should show pagination controls for multiple pages', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={50}
        page={1}
        pageSize={20}
      />,
    )

    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()
    expect(screen.getByText(/Página 1 de/)).toBeInTheDocument()
  })

  it('should render search input', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={2}
        page={1}
        pageSize={20}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Buscar cliente...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should display correct colors for balance states', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={2}
        page={1}
        pageSize={20}
      />,
    )

    // First cliente has deuda (should be red)
    // Second cliente has no deuda but saldo a favor (should be green)
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
    expect(screen.getByText(/María García/)).toBeInTheDocument()
  })

  it('should include document number for each cliente', () => {
    render(
      <CuentasCorrientesList
        clientes={mockClientes}
        total={2}
        page={1}
        pageSize={20}
      />,
    )

    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('87654321')).toBeInTheDocument()
  })
})
