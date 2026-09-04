'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit2, Trash2, Download } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { listarMascotasClienteAction } from '@/app/admin/actions/mascotas'
import type { Mascota } from '@/lib/types/database'

export default function MascotaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const mascotaId = params.id as string

  const [mascota, setMascota] = useState<Mascota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mascotaId) {
      loadMascota()
    }
  }, [mascotaId])

  async function loadMascota() {
    setLoading(true)
    setError(null)

    // TODO: Implement obtenerMascotaAction to fetch individual mascota
    // For now, mock the mascota data
    setError('Detalle de mascota no disponible aún')
    setLoading(false)
  }

  const handleExport = () => {
    // TODO: Implement PDF export for mascota
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-400">Cargando mascota...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
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
            <p className="text-red-800 dark:text-red-300 font-medium">Información</p>
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
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

        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">Detalle de mascota</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Próximamente disponible</p>
        </div>
      </div>
    </AdminLayout>
  )
}
