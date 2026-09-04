'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Cliente360View } from '@/components/admin/clientes/cliente-360-view'
import { obtenerHistorial360ClienteAction } from '@/app/admin/actions/clientes'
import type { Cliente, Mascota, Turno, Consulta } from '@/lib/types/database'

interface Historial360Data {
  cliente: Cliente
  mascotas: Mascota[]
  turnos: Turno[]
  consultas: Consulta[]
}

export default function Cliente360Page() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [data, setData] = useState<Historial360Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (clienteId) {
      loadHistorial()
    }
  }, [clienteId])

  async function loadHistorial() {
    setLoading(true)
    setError(null)

    const result = await obtenerHistorial360ClienteAction(clienteId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setData(result.data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-400">Cargando historial...</div>
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
            <p className="text-red-700 dark:text-red-400 text-sm">{error || 'No se pudo cargar el historial'}</p>
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

        <Cliente360View data={data} />
      </div>
    </AdminLayout>
  )
}
