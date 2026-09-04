"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {LogOut} from "lucide-react";
import {createClient} from "@/lib/supabase/client";

export function LogoutButton(){const [loading,setLoading]=useState(false);const router=useRouter();async function logout(){if(loading)return;setLoading(true);await createClient().auth.signOut({scope:"global"});router.replace("/login");router.refresh()}return <button onClick={()=>void logout()} disabled={loading} title="Cerrar sesión en todos los dispositivos" aria-label="Cerrar sesión en todos los dispositivos" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><LogOut size={20}/></button>}
