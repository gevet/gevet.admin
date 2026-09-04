'use client'

import { useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClienteConCuenta {
  id: string
  nombre: string
  apellido: string
  numero_documento: string
  saldo_deuda: number
  saldo_favor: number
  limite_credito: number
}

interface CuentasCorrientesListProps {
  clientes: ClienteConCuenta[]
  total: number
  page: number
  pageSize: number
}

export function CuentasCorrientesList({
  clientes,
  total,
  page,
  pageSize,
}: CuentasCorrientesListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const handleClienteClick = (clienteId: string) => {
    router.push(`/admin/clientes/${clienteId}/cuenta-corriente`)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Clientes List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {clientes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>No hay clientes para mostrar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => handleClienteClick(cliente.id)}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {cliente.nombre} {cliente.apellido}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {cliente.numero_documento}
                  </p>
                </div>

                <div className="flex items-center gap-6 mr-4">
                  {/* Saldo Deuda */}
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Deuda</p>
                    <p className={`font-bold ${
                      cliente.saldo_deuda > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      ${cliente.saldo_deuda.toFixed(2)}
                    </p>
                  </div>

                  {/* Saldo Favor */}
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">A Favor</p>
                    <p className={`font-bold ${
                      cliente.saldo_favor > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      ${cliente.saldo_favor.toFixed(2)}
                    </p>
                  </div>

                  {/* Límite */}
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Límite</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      ${cliente.limite_credito.toFixed(2)}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Mostrando {clientes.length} de {total} clientes
      </div>
    </div>
  )
}
