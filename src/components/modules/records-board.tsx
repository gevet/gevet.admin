"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {Download,Plus,Search,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {EmptyState} from "@/components/ui/empty-state";
import {Modal} from "@/components/ui/modal";
import {createClient} from "@/lib/supabase/client";

type RecordItem={id:string;nombre:string;detalle:Record<string,unknown>;creado_en:string};
type ModuleConfig={title:string;singular:string;description:string;detailLabel:string;tipo:string};
const config:Record<string,ModuleConfig>={
  clientes:{title:"Clientes",singular:"cliente",description:"Personas responsables y sus datos de contacto.",detailLabel:"Email o teléfono",tipo:"cliente"},
  mascotas:{title:"Pacientes",singular:"paciente",description:"Mascotas y su información clínica.",detailLabel:"Especie y responsable",tipo:"mascota"},
  consultas:{title:"Consultas",singular:"consulta",description:"Historia clínica y seguimiento veterinario.",detailLabel:"Motivo de consulta",tipo:"consulta"},
  agenda:{title:"Agenda",singular:"turno",description:"Turnos del equipo y la clínica.",detailLabel:"Fecha, hora y paciente",tipo:"turno"},
  items:{title:"Productos y servicios",singular:"ítem",description:"Catálogo, precios y servicios disponibles.",detailLabel:"Tipo y precio",tipo:"item"},
  inventario:{title:"Inventario",singular:"movimiento",description:"Existencias y movimientos de stock.",detailLabel:"Cantidad y depósito",tipo:"movimiento_stock"},
  caja:{title:"Caja y ventas",singular:"movimiento",description:"Ingresos, egresos y arqueos diarios.",detailLabel:"Importe y medio de pago",tipo:"movimiento_caja"},
  configuracion:{title:"Configuración",singular:"dato",description:"Datos del negocio y preferencias generales.",detailLabel:"Valor",tipo:"item"}
};

export function RecordsBoard({module}:{module:string}){
  const meta=config[module]??config.items;
  const [items,setItems]=useState<RecordItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string>();

  const load=useCallback(async()=>{
    setLoading(true);setError(undefined);
    try{
      const supabase=createClient();
      const {data,error:requestError}=await supabase.from("gestion_registros").select("id,nombre,detalle,creado_en").eq("tipo",meta.tipo).eq("activo",true).order("creado_en",{ascending:false}).limit(100);
      if(requestError)throw requestError;
      setItems((data??[]) as RecordItem[]);
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos cargar los registros");}
    finally{setLoading(false)}
  },[meta.tipo]);
  useEffect(()=>{void load()},[load]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;setSaving(true);setError(undefined);
    const form=new FormData(event.currentTarget);
    try{
      const supabase=createClient();
      const {error:requestError}=await supabase.from("gestion_registros").insert({tipo:meta.tipo,nombre:String(form.get("nombre")),detalle:{descripcion:String(form.get("detalle"))}});
      if(requestError)throw requestError;
      setOpen(false);await load();
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos guardar el registro");}
    finally{setSaving(false)}
  }
  async function remove(id:string){
    if(!confirm("¿Querés eliminar este registro?"))return;
    try{const supabase=createClient();const {error:requestError}=await supabase.from("gestion_registros").update({activo:false}).eq("id",id);if(requestError)throw requestError;setItems(current=>current.filter(item=>item.id!==id));}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos eliminar el registro")}
  }
  const filtered=useMemo(()=>items.filter(item=>(item.nombre+" "+String(item.detalle.descripcion??"")).toLowerCase().includes(query.toLowerCase())),[items,query]);
  function exportCsv(){const rows=[["Nombre","Detalle","Creado"],...items.map(item=>[item.nombre,String(item.detalle.descripcion??""),item.creado_en])];const csv=rows.map(row=>row.map(value=>`"${value.replaceAll('"','""')}"`).join(",")).join("\n");const anchor=document.createElement("a");anchor.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));anchor.download=`${module}.csv`;anchor.click();URL.revokeObjectURL(anchor.href)}

  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold capitalize text-blue-600">Gestión</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{meta.title}</h1><p className="mt-1 text-sm text-slate-500">{meta.description}</p></div><Button onClick={()=>setOpen(true)}><Plus size={18}/> Nuevo {meta.singular}</Button></div>{error&&<div role="alert" className="mt-5 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button className="font-semibold" onClick={()=>void load()}>Reintentar</button></div>}<Card className="mt-7 !p-0"><div className="flex flex-wrap gap-3 border-b border-slate-200 p-4"><label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={18} className="text-slate-400"/><input aria-label="Buscar" value={query} onChange={event=>setQuery(event.target.value)} className="min-h-11 flex-1 outline-none" placeholder={`Buscar en ${meta.title.toLowerCase()}…`}/></label><button onClick={exportCsv} disabled={!items.length} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40"><Download size={17}/> Exportar</button></div>{loading?<div className="min-h-64 animate-pulse bg-slate-50"/>:filtered.length===0?<EmptyState title={query?"No encontramos resultados":`Todavía no hay ${meta.title.toLowerCase()}`} description={query?"Probá con otros términos de búsqueda.":`Agregá tu primer ${meta.singular} para empezar.`} action={!query?<Button onClick={()=>setOpen(true)}><Plus size={18}/> Crear {meta.singular}</Button>:undefined}/>:<div>{filtered.map(item=><div key={item.id} className="grid gap-2 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.2fr_1.5fr_120px_44px] md:items-center"><div className="font-semibold">{item.nombre}</div><div className="text-sm text-slate-500">{String(item.detalle.descripcion??"")}</div><div className="text-xs text-slate-400">{new Intl.DateTimeFormat("es-AR").format(new Date(item.creado_en))}</div><button onClick={()=>void remove(item.id)} className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><Trash2 size={17}/></button></div>)}</div>}</Card><Modal open={open} onClose={()=>setOpen(false)} title={`Nuevo ${meta.singular}`}><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Nombre<input required name="nombre" autoFocus className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"/></label><label className="block text-sm font-medium">{meta.detailLabel}<textarea required name="detalle" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-500"/></label><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancelar</button><Button disabled={saving}>{saving?"Guardando…":"Guardar"}</Button></div></form></Modal></div>;
}
