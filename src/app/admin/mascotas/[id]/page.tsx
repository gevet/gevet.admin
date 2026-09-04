'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'

export default function MascotaDetailPage() {
  const router = useRouter()

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
