'use client'

import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { CuentasCorrientesListContainer } from '@/components/admin/cuentas-corrientes/cuentas-corrientes-list-container'

export default function CuentasCorrientesPage() {
  const router = useRouter()

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Cuentas Corrientes
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gestión de saldo y movimientos de clientes
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600 dark:text-slate-400">
                Cargando cuentas corrientes...
              </div>
            </div>
          }
        >
          <CuentasCorrientesListContainer />
        </Suspense>
      </div>
    </AdminLayout>
  )
}
