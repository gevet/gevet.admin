'use client'

import { CreditCard, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import type { CuentaCorriente, MovimientoCuentaCorriente } from '@/lib/types/database'

interface CuentaCorrienteViewProps {
  cuenta: CuentaCorriente | null
  movimientos: MovimientoCuentaCorriente[]
  clienteNombre: string
}

export function CuentaCorrienteView({
  cuenta,
  movimientos,
  clienteNombre,
}: CuentaCorrienteViewProps) {
  if (!cuenta) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <CreditCard className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">No hay cuenta corriente configurada</p>
      </div>
    )
  }

  const condicionPagoMap = {
    'Contado': 'Al contado',
    'Plazo 7': '7 días',
    'Plazo 15': '15 días',
    'Plazo 30': '30 días',
    'Plazo 45': '45 días',
    'Plazo 60': '60 días',
  }

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Cuenta Corriente
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">{clienteNombre}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {condicionPagoMap[cuenta.condicion_pago]}
            </span>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Saldo Deuda</p>
            <p className={`text-2xl font-bold ${
              cuenta.saldo_deuda > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-white'
            }`}>
              ${cuenta.saldo_deuda.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Saldo a Favor</p>
            <p className={`text-2xl font-bold ${
              cuenta.saldo_favor > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-slate-900 dark:text-white'
            }`}>
              ${cuenta.saldo_favor.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Límite de Crédito</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ${cuenta.limite_credito.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Condición de Pago</p>
              <p className="font-medium text-slate-900 dark:text-white mt-1">
                {condicionPagoMap[cuenta.condicion_pago]}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Días de Gracia</p>
              <p className="font-medium text-slate-900 dark:text-white mt-1">
                {cuenta.dias_de_gracia} días
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Historial de Movimientos
        </h3>

        {movimientos.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movimientos.map((movimiento) => (
              <div
                key={movimiento.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {movimiento.tipo === 'Cargo' ? (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20">
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {movimiento.referencia_tipo}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {movimiento.descripcion}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    movimiento.tipo === 'Cargo'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {movimiento.tipo === 'Cargo' ? '-' : '+'}${movimiento.monto.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(movimiento.creado_en).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
