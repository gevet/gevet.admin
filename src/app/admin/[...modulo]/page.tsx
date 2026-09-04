import {notFound} from "next/navigation";
import type {ComponentType} from "react";
import {RecordsBoard} from "@/components/modules/records-board";
import {ConsultasBoard} from "@/components/admin/consultas/consultas-board";
import {ProductosBoard} from "@/components/admin/productos/productos-board";
import {ComprasBoard} from "@/components/admin/compras/compras-board";
import {ContabilidadBoard} from "@/components/admin/contabilidad/contabilidad-board";
import {LaboratorioBoard} from "@/components/admin/laboratorio/laboratorio-board";
import {RecepcionBoard} from "@/components/admin/recepcion/recepcion-board";
import {getModule,MODULES} from "@/lib/modules/catalog";

/**
 * Modules with a purpose-built screen. Anything not listed here falls back to
 * the generic RecordsBoard.
 */
const CUSTOM_BOARDS: Record<string, ComponentType> = {
  consultas: ConsultasBoard,
  items: ProductosBoard,
  compras: ComprasBoard,
  proveedores: ComprasBoard,
  "ordenes-compra": ComprasBoard,
  contabilidad: ContabilidadBoard,
  laboratorio: LaboratorioBoard,
  "recepcion/checkin": RecepcionBoard,
  "recepcion/sala-espera": RecepcionBoard,
};

export function generateStaticParams(){return MODULES.filter(({slug})=>slug!=="dashboard").map(({slug})=>({modulo:slug.split("/")}))}

export default async function ModulePage({params}:{params:Promise<{modulo:string[]}>}){
  const {modulo} = await params;
  const slug = modulo.join("/");

  if(!getModule(slug)||slug==="dashboard") notFound();

  const Board = CUSTOM_BOARDS[slug];
  if (Board) return <Board />;

  return <RecordsBoard module={slug}/>;
}
