import {createServerClient} from "@supabase/ssr";
import type {CookieOptions} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

type CookieToSet={name:string;value:string;options:CookieOptions};

export async function middleware(request:NextRequest){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return NextResponse.redirect(new URL("/login?error=configuracion",request.url));
  let response=NextResponse.next({request});
  const supabase=createServerClient(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(cookies:CookieToSet[]){cookies.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL(`/login?retorno=${encodeURIComponent(request.nextUrl.pathname)}`,request.url));
  return response;
}

export const config={matcher:["/admin/:path*","/onboarding","/actualizar-clave"]};
