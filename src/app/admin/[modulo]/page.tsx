import {notFound} from "next/navigation";import {RecordsBoard} from "@/components/modules/records-board";
const modules=["agenda","clientes","mascotas","consultas","items","inventario","caja","configuracion"];
export function generateStaticParams(){return modules.map(modulo=>({modulo}))}
export default async function Page({params}:{params:Promise<{modulo:string}>}){const {modulo}=await params;if(!modules.includes(modulo))notFound();return <RecordsBoard module={modulo}/>}
