import {notFound} from "next/navigation";
import {RecordsBoard} from "@/components/modules/records-board";
import {ConsultasBoard} from "@/components/admin/consultas/consultas-board";
import {ProductosBoard} from "@/components/admin/productos/productos-board";
import {getModule,MODULES} from "@/lib/modules/catalog";

export function generateStaticParams(){return MODULES.filter(({slug})=>slug!=="dashboard").map(({slug})=>({modulo:slug.split("/")}))}

export default async function ModulePage({params}:{params:Promise<{modulo:string[]}>}){
  const {modulo} = await params;
  const slug = modulo.join("/");

  if(!getModule(slug)||slug==="dashboard") notFound();

  // Use custom boards for specific modules
  if (slug === "consultas") {
    return <ConsultasBoard />;
  }
  if (slug === "items") {
    return <ProductosBoard />;
  }

  return <RecordsBoard module={slug}/>;
}
