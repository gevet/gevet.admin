'use client'

import { useMemo } from 'react'
import { Calendar, Heart, FileText, TrendingUp, MapPin, Mail, Phone } from 'lucide-react'
import type { Cliente, Mascota, Turno, Consulta } from '@/lib/types/database'

interface Historial360Data {
  cliente: Cliente
  mascotas: Mascota[]
  turnos: Turno[]
  consultas: Consulta[]
}

interface Cliente360ViewProps {
  data: Historial360Data
}

/**
 * 360° Client History View
 * Displays unified timeline of all client interactions across mascotas, turnos, consultas
 */
export function Cliente360View({ data }: Cliente360ViewProps) {
  const { cliente, mascotas, turnos, consultas } = data

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMascotas = mascotas.length
    const totalTurnos = turnos.length
    const totalConsultas = consultas.length

    // Get last activity date
    const allDates = [
      ...turnos.map((t) => new Date(t.fecha_hora)),
      ...consultas.map((c) => new Date(c.creado_en)),
    ]
    const lastActivityDate =
      allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null

    return {
      totalMascotas,
      totalTurnos,
      totalConsultas,
      lastActivityDate,
    }
  }, [mascotas, turnos, consultas])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {cliente.nombre} {cliente.apellido}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {cliente.numero_documento}
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {cliente.email && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${cliente.email}`} className="hover:text-blue-600">
                {cliente.email}
              </a>
            </div>
          )}
          {cliente.telefono && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4" />
              <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>
            </div>
          )}
          {cliente.ciudad && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              {cliente.ciudad}
            </div>
          )}
        </div>

        {cliente.observaciones && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">{cliente.observaciones}</p>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Heart}
          label="Mascotas"
          value={stats.totalMascotas}
          color="text-pink-600"
        />
        <StatCard
          icon={Calendar}
          label="Turnos"
          value={stats.totalTurnos}
          color="text-blue-600"
        />
        <StatCard
          icon={FileText}
          label="Consultas"
          value={stats.totalConsultas}
          color="text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Última Actividad"
          value={stats.lastActivityDate ? formatDate(stats.lastActivityDate) : 'N/A'}
          color="text-purple-600"
        />
      </div>

      {/* Empty State */}
      {stats.totalMascotas === 0 && stats.totalTurnos === 0 && stats.totalConsultas === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            No hay información adicional disponible
          </p>
        </div>
      )}

      {/* Timeline Section (Future) */}
      {(stats.totalMascotas > 0 || stats.totalTurnos > 0 || stats.totalConsultas > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Historial Completo
          </h2>
          <div className="space-y-4">
            {/* Mascotas Section */}
            {mascotas.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Mascotas</h3>
                <div className="space-y-2">
                  {mascotas.map((mascota) => (
                    <div key={mascota.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {mascota.nombre} ({mascota.especie})
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {mascota.raza && `Raza: ${mascota.raza}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turnos Section */}
            {turnos.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  Últimos Turnos
                </h3>
                <div className="space-y-2">
                  {turnos.slice(0, 5).map((turno) => (
                    <div key={turno.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {new Date(turno.fecha_hora).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{turno.motivo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consultas Section */}
            {consultas.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  Últimas Consultas
                </h3>
                <div className="space-y-2">
                  {consultas.slice(0, 5).map((consulta) => (
                    <div key={consulta.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {new Date(consulta.creado_en).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {consulta.evaluacion?.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-20`} />
      </div>
    </div>
  )
}

/**
 * Format date utility
 */
function formatDate(date: Date): string {
  const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`
  return `Hace ${Math.floor(days / 365)} años`
}
