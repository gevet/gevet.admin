"use client";
import Link from "next/link";
import {useState} from "react";
import {LoaderCircle} from "lucide-react";
import {GevetLogo} from "@/components/brand/gevet-logo";
import {createClient} from "@/lib/supabase/client";
import {emailSchema} from "@/lib/validators/auth";

export function RecoveryForm(){
 const [loading,setLoading]=useState(false);const [message,setMessage]=useState<string>();const [error,setError]=useState<string>();
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(loading)return;setLoading(true);setError(undefined);const parsed=emailSchema.safeParse({email:new FormData(event.currentTarget).get("email")});if(!parsed.success){setError(parsed.error.issues[0]?.message);setLoading(false);return}try{const redirectTo=`${window.location.origin}/auth/callback?next=/actualizar-clave`;const {error:requestError}=await createClient().auth.resetPasswordForEmail(parsed.data.email,{redirectTo});if(requestError)throw requestError;setMessage("Si el email está registrado, vas a recibir un enlace para cambiar tu contraseña.")}catch(cause){setError(cause instanceof Error?cause.message:"No pudimos enviar el enlace")}finally{setLoading(false)}}
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><Link href="/"><GevetLogo priority imageClassName="h-12 w-12"/></Link><h1 className="mt-8 text-3xl font-bold">Recuperá tu acceso</h1><p className="mt-2 text-slate-500">Te enviaremos un enlace seguro para elegir una contraseña nueva.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium">Email<input required type="email" name="email" autoComplete="email" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<button disabled={loading||Boolean(message)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-60">{loading&&<LoaderCircle className="animate-spin" size={18}/>}Enviar enlace</button></form><Link href="/login" className="mt-6 block text-center text-sm font-semibold text-blue-600">Volver al ingreso</Link></section></main>
}
