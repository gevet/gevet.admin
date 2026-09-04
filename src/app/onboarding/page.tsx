'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Upload, X } from 'lucide-react'
import { GevetLogo } from '@/components/brand/gevet-logo'
import { Button } from '@/components/ui/button'
import { completarOnboardingAction } from '@/app/admin/actions/onboarding'

const steps = ['Tu veterinaria', 'Identidad visual', 'Sucursal principal', 'Todo listo']

interface OnboardingData {
  nombreComercial: string
  telefono: string
  colorPrincipal: string
  colorSecundario: string
  colorAccento: string
  logo: File | null
  nombreSucursal: string
  direccion: string
  ciudad: string
  provincia: string
  email: string
  horarioApertura: string
  horarioCierre: string
}

const VALID_PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<OnboardingData>({
    nombreComercial: '',
    telefono: '',
    colorPrincipal: '#2563eb',
    colorSecundario: '#1e293b',
    colorAccento: '#0ea5e9',
    logo: null,
    nombreSucursal: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    email: '',
    horarioApertura: '09:00',
    horarioCierre: '18:00',
  })

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no puede exceder 5MB')
        return
      }
      setData((prev) => ({ ...prev, logo: file }))
      setError(null)
    }
  }

  const clearLogo = () => {
    setData((prev) => ({ ...prev, logo: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      if (!VALID_PHONE_REGEX.test(data.telefono)) {
        setError('El formato de teléfono no es válido')
        return false
      }
    } else if (step === 1) {
      if (!data.colorPrincipal) {
        setError('Debe seleccionar un color principal')
        return false
      }
      if (!data.colorSecundario) {
        setError('Debe seleccionar un color secundario')
        return false
      }
      if (!data.colorAccento) {
        setError('Debe seleccionar un color de acento')
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
      if (!data.ciudad.trim()) {
        setError('La ciudad es requerida')
        return false
      }
      if (!data.provincia.trim()) {
        setError('La provincia es requerida')
        return false
      }
      if (data.email && !VALID_EMAIL_REGEX.test(data.email)) {
        setError('El formato de email no es válido')
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
        const formData = new FormData()
        formData.append('nombreComercial', data.nombreComercial)
        formData.append('telefono', data.telefono)
        formData.append('colorPrincipal', data.colorPrincipal)
        formData.append('colorSecundario', data.colorSecundario)
        formData.append('colorAccento', data.colorAccento)
        formData.append('nombreSucursal', data.nombreSucursal)
        formData.append('direccion', data.direccion)
        formData.append('ciudad', data.ciudad)
        formData.append('provincia', data.provincia)
        formData.append('email', data.email)
        formData.append('horarioApertura', data.horarioApertura)
        formData.append('horarioCierre', data.horarioCierre)
        if (data.logo) {
          formData.append('logo', data.logo)
        }

        const result = await completarOnboardingAction(formData)
        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }
        setStep(3)
      } catch (err) {
        console.error('Error:', err)
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
              ? 'Completá los datos de tu veterinaria.'
              : step === 1
                ? 'Elegí los colores que representan a tu negocio.'
                : step === 2
                  ? 'Configurá tu sucursal principal.'
                  : 'Ya podés empezar a organizar tu veterinaria.'}
          </p>

          {step < 3 ? (
            <div className="mt-7 space-y-6">
              {step === 0 && (
                <>
                  <label className="block text-sm font-medium">
                    Nombre comercial *
                    <input
                      type="text"
                      value={data.nombreComercial}
                      onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
                      placeholder="Ej: Veterinaria Central"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Teléfono *
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
                  <div className="grid grid-cols-3 gap-4">
                    <label className="block text-sm font-medium">
                      Color principal *
                      <div className="mt-1.5 flex items-center gap-3">
                        <input
                          type="color"
                          value={data.colorPrincipal}
                          onChange={(e) => handleInputChange('colorPrincipal', e.target.value)}
                          className="h-12 w-20 cursor-pointer rounded-xl border border-slate-300"
                        />
                        <span className="text-xs text-slate-600">{data.colorPrincipal}</span>
                      </div>
                    </label>
                    <label className="block text-sm font-medium">
                      Color secundario *
                      <div className="mt-1.5 flex items-center gap-3">
                        <input
                          type="color"
                          value={data.colorSecundario}
                          onChange={(e) => handleInputChange('colorSecundario', e.target.value)}
                          className="h-12 w-20 cursor-pointer rounded-xl border border-slate-300"
                        />
                        <span className="text-xs text-slate-600">{data.colorSecundario}</span>
                      </div>
                    </label>
                    <label className="block text-sm font-medium">
                      Color de acento *
                      <div className="mt-1.5 flex items-center gap-3">
                        <input
                          type="color"
                          value={data.colorAccento}
                          onChange={(e) => handleInputChange('colorAccento', e.target.value)}
                          className="h-12 w-20 cursor-pointer rounded-xl border border-slate-300"
                        />
                        <span className="text-xs text-slate-600">{data.colorAccento}</span>
                      </div>
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Logo (opcional)
                    <div className="mt-2 flex items-center gap-3">
                      {data.logo ? (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
                          <Check size={16} className="text-emerald-600" />
                          <span className="text-sm text-emerald-700">{data.logo.name}</span>
                          <button
                            type="button"
                            onClick={clearLogo}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-blue-500 hover:bg-blue-50"
                        >
                          <Upload size={16} />
                          Seleccionar imagen
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Máx. 5MB. Formatos: PNG, JPG, SVG</p>
                  </label>
                </>
              )}

              {step === 2 && (
                <>
                  <label className="block text-sm font-medium">
                    Nombre de la sucursal *
                    <input
                      type="text"
                      value={data.nombreSucursal}
                      onChange={(e) => handleInputChange('nombreSucursal', e.target.value)}
                      placeholder="Ej: Sucursal Centro"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Dirección *
                    <input
                      type="text"
                      value={data.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      placeholder="Ej: Av. Principal 123"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-medium">
                      Ciudad *
                      <input
                        type="text"
                        value={data.ciudad}
                        onChange={(e) => handleInputChange('ciudad', e.target.value)}
                        placeholder="Ej: Buenos Aires"
                        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Provincia *
                      <input
                        type="text"
                        value={data.provincia}
                        onChange={(e) => handleInputChange('provincia', e.target.value)}
                        placeholder="Ej: Buenos Aires"
                        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Email de la sucursal (opcional)
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Ej: sucursal@veterinaria.com"
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-medium">
                      Horario de apertura
                      <input
                        type="time"
                        value={data.horarioApertura}
                        onChange={(e) => handleInputChange('horarioApertura', e.target.value)}
                        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Horario de cierre
                      <input
                        type="time"
                        value={data.horarioCierre}
                        onChange={(e) => handleInputChange('horarioCierre', e.target.value)}
                        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="my-9 rounded-2xl bg-emerald-50 p-7 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check />
              </span>
              <h2 className="mt-4 font-bold">¡Tu veterinaria está configurada!</h2>
              <div className="mt-4 space-y-2 text-left text-sm text-emerald-800">
                <p>✓ Nombre: <span className="font-medium">{data.nombreComercial}</span></p>
                <p>✓ Sucursal: <span className="font-medium">{data.nombreSucursal}</span></p>
                <p>✓ Ciudad: <span className="font-medium">{data.ciudad}, {data.provincia}</span></p>
                <p>✓ Colores personalizados configurados</p>
              </div>
              <p className="mt-4 text-sm text-emerald-800">
                Podés modificar todo más adelante desde Configuración.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Atrás
              </button>
            )}
            <div className="ml-auto">
              <Button
                onClick={step < 3 ? handleContinue : handleFinish}
                disabled={loading}
                className="gap-2"
              >
                {loading ? 'Guardando...' : step < 3 ? 'Continuar' : 'Ir al dashboard'}
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
