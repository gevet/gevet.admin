'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CuentasCorrientesList } from './cuentas-corrientes-list'
import { obtenerClientesConCuentasAction } from '@/app/admin/actions/cuentas-corrientes'

interface ClienteConCuenta {
  id: string
  nombre: string
  apellido: string
  numero_documento: string
  saldo_deuda: number
  saldo_favor: number
  limite_credito: number
}

export function CuentasCorrientesListContainer() {
  const searchParams = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [clientes, setClientes] = useState<ClienteConCuenta[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClientes()
  }, [page])

  async function loadClientes() {
    setLoading(true)
    setError(null)

    const result = await obtenerClientesConCuentasAction(page)
    if (result.error) {
      setError(result.error)
      setClientes([])
      setTotal(0)
    } else if (result.data) {
      setClientes(result.data.clientes)
      setTotal(result.data.total)
    }
    setLoading(false)
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <CuentasCorrientesList
      clientes={clientes}
      total={total}
      page={page}
      pageSize={20}
    />
  )
}
