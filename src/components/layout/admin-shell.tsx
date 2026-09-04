"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useMemo,useState} from "react";
import {Bell,ChevronLeft,ChevronRight,LayoutGrid,Menu,Search,Settings,X} from "lucide-react";
import {GevetLogo} from "@/components/brand/gevet-logo";
import {LogoutButton} from "@/components/auth/logout-button";
import {MODULE_GROUPS,MODULES} from "@/lib/modules/catalog";

export function AdminShell({children}:{children:React.ReactNode}){
  const path=usePathname();
  const [open,setOpen]=useState(false);
  const [small,setSmall]=useState(false);
  const [filter,setFilter]=useState("");
  const groups=useMemo(()=>MODULE_GROUPS.map(group=>({group,modules:MODULES.filter(module=>module.group===group&&module.title.toLowerCase().includes(filter.toLowerCase()))})).filter(({modules})=>modules.length),[filter]);
  return <div className="min-h-screen lg:flex">
    <aside className={`fixed inset-y-0 left-0 z-40 flex bg-slate-950 text-slate-300 transition-all lg:sticky lg:top-0 lg:h-screen ${small?"lg:w-20":"lg:w-72"} ${open?"w-72 translate-x-0":"w-72 -translate-x-full lg:translate-x-0"}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-17 items-center justify-between border-b border-white/10 px-5"><Link href="/admin/dashboard" className="text-white"><GevetLogo imageClassName="h-11 w-11" showName={!small}/></Link><button className="lg:hidden" onClick={()=>setOpen(false)} aria-label="Cerrar menú"><X/></button></div>
        {!small&&<label className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-white/8 px-3"><Search size={16}/><input value={filter} onChange={event=>setFilter(event.target.value)} className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none" placeholder="Filtrar módulos" aria-label="Filtrar módulos"/></label>}
        <nav className="scrollbar flex-1 overflow-y-auto p-3">{groups.map(({group,modules})=><section key={group} className="mb-4">{!small&&<h2 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group}</h2>}<div className="space-y-1">{modules.map(item=>{const href=`/admin/${item.slug}`;const active=path===href;return <Link key={item.slug} href={href} onClick={()=>setOpen(false)} title={item.title} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium ${active?"bg-blue-600 text-white":"hover:bg-white/7 hover:text-white"}`}><LayoutGrid className="shrink-0" size={17}/>{!small&&<span className="truncate">{item.title}</span>}</Link>})}</div></section>)}</nav>
        <div className="border-t border-white/10 p-3"><Link href="/admin/configuracion" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/7"><Settings size={19}/>{!small&&"Configuración"}</Link><button onClick={()=>setSmall(!small)} className="mt-1 hidden min-h-10 w-full items-center justify-center rounded-xl hover:bg-white/7 lg:flex" aria-label={small?"Expandir menú":"Contraer menú"}>{small?<ChevronRight/>:<ChevronLeft/>}</button></div>
      </div>
    </aside>
    {open&&<button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={()=>setOpen(false)}/>}<div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-17 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-7"><button className="rounded-lg p-2 lg:hidden" onClick={()=>setOpen(true)} aria-label="Abrir menú"><Menu/></button><button className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-left text-sm text-slate-500 sm:flex"><Search size={18}/> Buscar en GeVet <kbd className="ml-auto rounded border bg-white px-2 py-0.5 text-xs">⌘ K</kbd></button><span className="flex-1 sm:hidden"/><button className="relative rounded-xl p-2.5 hover:bg-slate-100" aria-label="Notificaciones"><Bell size={20}/></button><div className="h-9 w-9 rounded-full bg-blue-100 text-center text-sm font-bold leading-9 text-blue-700">US</div><LogoutButton/></header><main className="mx-auto max-w-[1500px] p-4 sm:p-7">{children}</main></div>
  </div>
}
