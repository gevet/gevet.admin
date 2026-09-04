-- El tenant se crea desde Auth y nunca se acepta desde el navegador.
create or replace function public.crear_tenant_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  nuevo_tenant_id uuid := gen_random_uuid();
  nombre_negocio text := trim(coalesce(new.raw_user_meta_data->>'nombre_comercial',''));
  slug_negocio text;
begin
  if char_length(nombre_negocio) < 2 then
    raise exception 'El nombre comercial es obligatorio';
  end if;
  slug_negocio := trim(both '-' from regexp_replace(lower(unaccent(nombre_negocio)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(nuevo_tenant_id::text,1,8);
  insert into public.tenants(id,nombre_comercial,slug) values(nuevo_tenant_id,nombre_negocio,slug_negocio);
  insert into public.tenant_branding(tenant_id) values(nuevo_tenant_id);
  insert into public.gestion_usuarios(tenant_id,auth_user_id,nombre,email)
    values(nuevo_tenant_id,new.id,nombre_negocio,new.email);
  return new;
end;
$$;

create extension if not exists unaccent;
drop trigger if exists al_crear_usuario_auth on auth.users;
create trigger al_crear_usuario_auth after insert on auth.users
for each row execute function public.crear_tenant_desde_auth();

alter table public.gestion_registros alter column tenant_id set default public.tenant_id();
alter table public.gestion_registros alter column creado_por set default auth.uid();

-- Impide que incluso un cliente malicioso suplante el contexto calculado.
create or replace function public.forzar_contexto_registro()
returns trigger language plpgsql set search_path=public,auth as $$
begin
  new.tenant_id := public.tenant_id();
  new.creado_por := coalesce(new.creado_por,auth.uid());
  return new;
end;
$$;
drop trigger if exists registros_contexto on public.gestion_registros;
create trigger registros_contexto before insert on public.gestion_registros
for each row execute function public.forzar_contexto_registro();
