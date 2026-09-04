'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'

interface SalesMetrics {
  totalVentas: number
  totalIngresos: number
  ventasHoy: number
  ingresosHoy: number
  clientesConVentas: number
  productosVendidos: number
  articulosPromedio: number
}

export function SalesMetrics() {
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalVentas: 0,
    totalIngresos: 0,
    ventasHoy: 0,
    ingresosHoy: 0,
    clientesConVentas: 0,
    productosVendidos: 0,
    articulosPromedio: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get all sales
      const { data: allVentas } = await supabase.from('ventas').select('total, creado_en, cliente_id, cantidad')

      // Get today's sales
      const { data: ventasHoy } = await supabase
        .from('ventas')
        .select('total, cliente_id')
        .gte('creado_en', today.toISOString())

      // Get unique clients with sales
      const { data: clientesUnicos } = await supabase
        .from('ventas')
        .select('cliente_id')
        .eq('estado', 'Completada')

      // Get product count
      const { data: productos } = await supabase.from('productos').select('id').eq('activo', true)

      const allVentasArray = allVentas || []
      const ventasHoyArray = ventasHoy || []
      const clientesSet = new Set((clientesUnicos || []).map((v: any) => v.cliente_id))
      const cantidadTotal = allVentasArray.reduce((sum: number, v: any) => sum + (v.cantidad || 0), 0)

      setMetrics({
        totalVentas: allVentasArray.length,
        totalIngresos: allVentasArray.reduce((sum: number, v: any) => sum + (v.total || 0), 0),
        ventasHoy: ventasHoyArray.length,
        ingresosHoy: ventasHoyArray.reduce((sum: number, v: any) => sum + (v.total || 0), 0),
        clientesConVentas: clientesSet.size,
        productosVendidos: productos?.length || 0,
        articulosPromedio: allVentasArray.length > 0 ? cantidadTotal / allVentasArray.length : 0,
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={ShoppingCart}
        label="Ventas totales"
        value={metrics.totalVentas}
        subtext={`${metrics.ventasHoy} hoy`}
        loading={loading}
      />
      <MetricCard
        icon={DollarSign}
        label="Ingresos totales"
        value={`$${metrics.totalIngresos.toFixed(2)}`}
        subtext={`+$${metrics.ingresosHoy.toFixed(2)} hoy`}
        loading={loading}
      />
      <MetricCard
        icon={Users}
        label="Clientes con ventas"
        value={metrics.clientesConVentas}
        subtext={`${metrics.productosVendidos} productos`}
        loading={loading}
      />
      <MetricCard
        icon={TrendingUp}
        label="Artículos promedio"
        value={metrics.articulosPromedio.toFixed(1)}
        subtext="por venta"
        loading={loading}
      />
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subtext: string
  loading?: boolean
}

function MetricCard({ icon: Icon, label, value, subtext, loading }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {loading ? '—' : value}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>
        </div>
        <Icon className="w-8 h-8 text-blue-600 opacity-20" />
      </div>
    </Card>
  )
}
