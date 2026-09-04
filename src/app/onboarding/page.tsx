'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { GevetLogo } from '@/components/brand/gevet-logo'
import { Button } from '@/components/ui/button'
import { completarOnboardingAction } from '@/app/admin/actions/onboarding'

const steps = ['Tu veterinaria', 'Identidad visual', 'Sucursal principal', 'Todo listo']

interface OnboardingData {
  nombreComercial: string
  telefono: string
  colorPrincipal: string
  nombreSucursal: string
  direccion: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [data, setData] = useState<OnboardingData>({
    nombreComercial: '',
    telefono: '',
    colorPrincipal: '#2563eb',
    nombreSucursal: '',
    direccion: '',
  })

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!data.nombreComercial.trim()) {
        setError('El nombre comercial es requerido')
        return false
      }
      if (!data.telefono.trim()) {
        setError('El teléfono es requerido')
        return false
      }
    } else if (step === 2) {
      if (!data.nombreSucursal.trim()) {
        setError('El nombre de la sucursal es requerido')
        return false
      }
      if (!data.direccion.trim()) {
        setError('La dirección es requerida')
        return false
      }
    }
    return true
  }

  const handleContinue = async () => {
    if (!validateStep()) return

    if (step === 2) {
      setLoading(true)
      try {
        const result = await completarOnboardingAction(data)
        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }
        setStep(3)
      } catch (err) {
        setError('Error al guardar los datos')
        setLoading(false)
      }
    } else {
      setStep(step + 1)
    }
  }

  const handleFinish = () => {
    router.push('/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <GevetLogo priority imageClassName="h-10 w-10" />
          <span className="text-sm font-semibold text-slate-500">Configuración inicial</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[240px_1fr]">
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li
              key={s}
              className={`flex items-center gap-3 text-sm ${
                i <= step ? 'font-semibold text-slate-900' : 'text-slate-400'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200'
                }`}
              >
                {i < step ? <Check size={17} /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold text-blue-600">
            Paso {step + 1} de {steps.length}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{steps[step]}</h1>
          <p className="mt-2 text-slate-500">
            {step === 0
              ? 'Completá los datos que va a ver tu equipo.'
              : step === 1
                ? 'Elegí el estilo que representa a tu negocio.'
                : step === 2
                  ? 'Indicá dónde atendés habitualmente.'
                  : 'Ya podés empezar a organizar tu veterinaria.'}
          </p>

          {step < 3 ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {step === 0 && (
                <>
                  <label className="text-sm font-medium">
                    Nombre comercial
                    <input
                      type="text"
                      value={data.nombreComercial}
                      onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
                      placeholder="Ej: Veterinaria Central"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Teléfono
                    <input
                      type="tel"
                      value={data.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      placeholder="Ej: +54 9 11 1234 5678"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  <label className="text-sm font-medium">
                    Color principal
                    <input
                      type="color"
                      value={data.colorPrincipal}
                      onChange={(e) => handleInputChange('colorPrincipal', e.target.value)}
                      className="mt-1.5 h-12 w-full cursor-pointer rounded-xl border border-slate-300"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Logo (opcional)
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-600 hover:file:bg-blue-100"
                    />
                  </label>
                </>
              )}
              {step === 2 && (
                <>
                  <label className="text-sm font-medium">
                    Nombre de la sucursal
                    <input
                      type="text"
                      value={data.nombreSucursal}
                      onChange={(e) => handleInputChange('nombreSucursal', e.target.value)}
                      placeholder="Ej: Sucursal Centro"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Dirección
                    <input
                      type="text"
                      value={data.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      placeholder="Ej: Av. Principal 123"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className="my-9 rounded-2xl bg-emerald-50 p-7 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check />
              </span>
              <h2 className="mt-4 font-bold">Tu espacio está preparado</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Podés modificar todo más adelante desde Configuración.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              onClick={step < 3 ? handleContinue : handleFinish}
              disabled={loading}
              className="gap-2"
            >
              {loading ? 'Guardando...' : step < 3 ? 'Continuar' : 'Ir al inicio'}
              <ChevronRight size={18} />
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
