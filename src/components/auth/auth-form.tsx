"use client";

import Link from "next/link";
import {useState} from "react";
import {Eye,EyeOff,LoaderCircle} from "lucide-react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {loginSchema,registrationSchema} from "@/lib/validators/auth";
import {GevetLogo} from "@/components/brand/gevet-logo";

export function AuthForm({mode}:{mode:"login"|"registro"}){
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string>();
  const [success,setSuccess]=useState<string>();
  const router=useRouter();
  const registro=mode==="registro";

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(loading)return;
    setLoading(true);setError(undefined);setSuccess(undefined);
    const form=new FormData(event.currentTarget);
    const input={email:String(form.get("email")),password:String(form.get("password")),nombreComercial:String(form.get("negocio")??"")};
    const validation=(registro?registrationSchema:loginSchema).safeParse(input);
    if(!validation.success){setError(validation.error.issues[0]?.message??"Revisá los datos ingresados");setLoading(false);return}
    try{
      const supabase=createClient();
      if(registro){
        const result=await supabase.auth.signUp({email:input.email,password:input.password,options:{data:{nombre_comercial:input.nombreComercial}}});
        if(result.error)throw result.error;
        if(!result.data.session){setSuccess("Revisá tu email para confirmar la cuenta y continuar.");return}
        router.replace("/onboarding");
      }else{
        const result=await supabase.auth.signInWithPassword({email:input.email,password:input.password});
        if(result.error)throw result.error;
        router.replace("/admin/dashboard");router.refresh();
      }
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos completar la operación");}
    finally{setLoading(false)}
  }

  return <main className="flex min-h-screen bg-white"><aside className="hidden w-1/2 bg-slate-950 p-14 text-white lg:flex lg:flex-col lg:justify-between"><GevetLogo priority imageClassName="h-14 w-14" className="text-xl"/><div><blockquote className="max-w-lg text-3xl font-semibold leading-snug">Toda la información de tu clínica, lista cuando la necesitás.</blockquote><p className="mt-4 text-slate-400">Una experiencia simple para equipos que cuidan.</p></div><p className="text-xs text-slate-500">Gestión veterinaria segura y configurable</p></aside><section className="flex flex-1 items-center justify-center px-5 py-12"><div className="w-full max-w-md"><Link href="/" className="mb-10 inline-flex lg:hidden"><GevetLogo priority imageClassName="h-12 w-12" className="text-lg"/></Link><h1 className="text-3xl font-bold tracking-tight">{registro?"Creá tu espacio de trabajo":"Qué bueno verte de nuevo"}</h1><p className="mt-2 text-slate-500">{registro?"Probalo gratis por 14 días. Sin tarjeta.":"Ingresá para continuar con tu jornada."}</p><form onSubmit={submit} className="mt-8 space-y-4">{registro&&<label className="block text-sm font-medium">Nombre de la veterinaria<input required name="negocio" className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Nombre comercial"/></label>}<label className="block text-sm font-medium">Email<input required type="email" name="email" autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="tu@email.com"/></label><label className="block text-sm font-medium">Contraseña<div className="relative"><input required minLength={8} type={show?"text":"password"} name="password" autoComplete={registro?"new-password":"current-password"} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-blue-500" placeholder="Mínimo 8 caracteres"/><button type="button" className="absolute right-3 top-4 text-slate-400" onClick={()=>setShow(!show)} aria-label="Mostrar contraseña">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}<button disabled={loading||Boolean(success)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-60">{loading&&<LoaderCircle className="animate-spin" size={18}/>} {registro?"Crear cuenta":"Ingresar"}</button></form><p className="mt-6 text-center text-sm text-slate-500">{registro?"¿Ya tenés cuenta?":"¿Todavía no tenés cuenta?"} <Link className="font-semibold text-blue-600" href={registro?"/login":"/registro"}>{registro?"Ingresá":"Empezá gratis"}</Link></p></div></section></main>}
