import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { GevetLogo } from '@/components/brand/gevet-logo'

export default function TrialVencido() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/">
          <GevetLogo priority imageClassName="h-12 w-12" />
        </Link>

        <div className="mt-8 flex items-start gap-4">
          <AlertCircle className="mt-1 flex-shrink-0 text-amber-600" size={24} />
          <div>
            <h1 className="text-2xl font-bold">Tu período de prueba venció</h1>
            <p className="mt-2 text-slate-600">
              Tu acceso está limitado mientras se resuelve tu suscripción.
            </p>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-slate-600">
                <strong>¿Qué hacer?</strong>
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-slate-600">
                <li>Ponte en contacto con nosotros para actualizar tu plan</li>
                <li>Elige un plan mensual o anual</li>
                <li>Recuperá el acceso inmediatamente</li>
              </ul>
            </div>

            <a
              href="mailto:soporte@gevet.app"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
