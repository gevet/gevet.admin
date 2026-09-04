'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { CuentaCorrienteView } from '@/components/admin/cuentas-corrientes/cuenta-corriente-view'
import { obtenerCuentaCorrienteAction } from '@/app/admin/actions/cuentas-corrientes'
import type { CuentaCorriente, MovimientoCuentaCorriente } from '@/lib/types/database'

interface CuentaCorrienteData {
  cuenta: CuentaCorriente | null
  movimientos: MovimientoCuentaCorriente[]
}

export default function CuentaCorrientePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [data, setData] = useState<CuentaCorrienteData | null>(null)
  const [clienteNombre, setClienteNombre] = useState('Cliente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (clienteId) {
      loadCuentaCorriente()
    }
  }, [clienteId])

  async function loadCuentaCorriente() {
    setLoading(true)
    setError(null)

    const result = await obtenerCuentaCorrienteAction(clienteId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setData(result.data)
      // TODO: Get cliente name from server action or database
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-400">Cargando cuenta corriente...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-400 text-sm">
              {error || 'No se pudo cargar la cuenta corriente'}
            </p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <CuentaCorrienteView
          cuenta={data.cuenta}
          movimientos={data.movimientos}
          clienteNombre={clienteNombre}
        />
      </div>
    </AdminLayout>
  )
}
