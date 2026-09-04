import {z} from "zod";

export const emailSchema=z.object({email:z.string().trim().email("Ingresá un email válido")});
export const loginSchema=emailSchema.extend({password:z.string().min(8,"La contraseña debe tener al menos 8 caracteres")});
export const registrationSchema=loginSchema.extend({nombreComercial:z.string().trim().min(2,"Ingresá el nombre comercial").max(120)});
export const passwordUpdateSchema=z.object({
  password:z.string().min(8,"La contraseña debe tener al menos 8 caracteres").max(128),
  confirmation:z.string(),
}).refine(({password,confirmation})=>password===confirmation,{message:"Las contraseñas no coinciden",path:["confirmation"]});
export const authCallbackSchema=z.object({code:z.string().min(1),next:z.string().startsWith("/").default("/admin/dashboard")});
