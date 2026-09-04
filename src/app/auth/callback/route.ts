import {NextResponse,type NextRequest} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {authCallbackSchema} from "@/lib/validators/auth";

export async function GET(request:NextRequest){const parsed=authCallbackSchema.safeParse({code:request.nextUrl.searchParams.get("code"),next:request.nextUrl.searchParams.get("next")??undefined});if(!parsed.success)return NextResponse.redirect(new URL("/login?error=enlace-invalido",request.url));const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(parsed.data.code);if(error)return NextResponse.redirect(new URL("/login?error=enlace-vencido",request.url));return NextResponse.redirect(new URL(parsed.data.next,request.url))}
