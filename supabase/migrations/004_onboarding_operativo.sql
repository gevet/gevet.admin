alter table public.tenants add column if not exists razon_social text;
alter table public.tenants add column if not exists cuit text;
alter table public.tenants add column if not exists telefono text;
alter table public.tenants add column if not exists email text;
alter table public.tenants add column if not exists direccion text;

create table if not exists public.gestion_sucursales(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth.tenant_id() references public.tenants(id) on delete cascade,
  nombre text not null,
  direccion text,
  telefono text,
  es_principal boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  activo boolean not null default true
);
alter table public.gestion_sucursales enable row level security;
drop policy if exists sucursales_aislamiento on public.gestion_sucursales;
create policy sucursales_aislamiento on public.gestion_sucursales for all
  using(tenant_id=auth.tenant_id()) with check(tenant_id=auth.tenant_id());
create index if not exists sucursales_tenant_nombre_idx on public.gestion_sucursales(tenant_id,nombre);

create or replace function public.rpc_completar_onboarding(
  p_nombre_comercial text,p_razon_social text,p_cuit text,p_telefono text,p_email text,
  p_direccion text,p_timezone text,p_moneda text,p_color_primario text,
  p_color_secundario text,p_color_acento text,p_sucursal_nombre text,p_sucursal_direccion text
) returns void language plpgsql security invoker set search_path=public,auth as $$
declare contexto uuid := auth.tenant_id();
begin
  if contexto is null then raise exception 'Sesión no válida'; end if;
  if char_length(trim(p_nombre_comercial))<2 then raise exception 'Ingresá el nombre comercial'; end if;
  if p_color_primario !~ '^#[0-9a-fA-F]{6}$' or p_color_secundario !~ '^#[0-9a-fA-F]{6}$' or p_color_acento !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Los colores no son válidos'; end if;
  update public.tenants set nombre_comercial=trim(p_nombre_comercial),razon_social=nullif(trim(p_razon_social),''),cuit=nullif(trim(p_cuit),''),telefono=nullif(trim(p_telefono),''),email=nullif(trim(p_email),''),direccion=nullif(trim(p_direccion),''),timezone=p_timezone,moneda=p_moneda,onboarding_completado=true,actualizado_en=now() where id=contexto;
  update public.tenant_branding set color_primario=p_color_primario,color_secundario=p_color_secundario,color_acento=p_color_acento,actualizado_en=now() where tenant_id=contexto;
  insert into public.gestion_sucursales(tenant_id,nombre,direccion,telefono,es_principal) values(contexto,trim(p_sucursal_nombre),nullif(trim(p_sucursal_direccion),''),nullif(trim(p_telefono),''),true);
end;$$;
grant execute on function public.rpc_completar_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
