import {redirect} from "next/navigation";
import {AdminShell} from "@/components/layout/admin-shell";
import {createClient} from "@/lib/supabase/server";

export default async function Layout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:profile}=await supabase.from("gestion_usuarios").select("tenant_id,tenants(nombre_comercial,onboarding_completado,tenant_branding(color_primario,color_secundario,color_acento))").eq("auth_user_id",user.id).single();
  const tenant=profile?.tenants as unknown as {nombre_comercial:string;onboarding_completado:boolean;tenant_branding:{color_primario:string;color_secundario:string;color_acento:string}[]}|null;
  const branding=tenant?.tenant_branding[0];
  if(tenant&&!tenant.onboarding_completado)redirect("/onboarding");
  return <AdminShell tenantName={tenant?.nombre_comercial??"Gestión veterinaria"} colors={{primario:branding?.color_primario??"#2563eb",secundario:branding?.color_secundario??"#0f172a",acento:branding?.color_acento??"#14b8a6"}}>{children}</AdminShell>;
}
