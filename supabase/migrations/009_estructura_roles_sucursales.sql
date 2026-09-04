-- Phase 3: Roles and Sucursales structure for multi-tenant operations

-- Roles table
create table if not exists public.roles(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  descripcion text,
  permisos jsonb not null default '[]',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, nombre)
);

alter table public.roles enable row level security;

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select
  using(tenant_id = public.tenant_id());

drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles for insert
  with check(tenant_id = public.tenant_id());

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles for delete
  using(tenant_id = public.tenant_id());

create index if not exists roles_tenant_activo_idx on public.roles(tenant_id, activo);

-- Sucursales table
create table if not exists public.sucursales(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  direccion text,
  ciudad text,
  provincia text,
  telefono text,
  email text,
  horario_apertura time,
  horario_cierre time,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, nombre)
);

alter table public.sucursales enable row level security;

drop policy if exists sucursales_select on public.sucursales;
create policy sucursales_select on public.sucursales for select
  using(tenant_id = public.tenant_id());

drop policy if exists sucursales_insert on public.sucursales;
create policy sucursales_insert on public.sucursales for insert
  with check(tenant_id = public.tenant_id());

drop policy if exists sucursales_update on public.sucursales;
create policy sucursales_update on public.sucursales for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists sucursales_delete on public.sucursales;
create policy sucursales_delete on public.sucursales for delete
  using(tenant_id = public.tenant_id());

create index if not exists sucursales_tenant_activo_idx on public.sucursales(tenant_id, activo);

-- Junction table: usuarios-roles
create table if not exists public.gestion_usuarios_roles(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.gestion_usuarios(id) on delete cascade,
  rol_id uuid not null references public.roles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique(usuario_id, rol_id)
);

alter table public.gestion_usuarios_roles enable row level security;

drop policy if exists usuarios_roles_select on public.gestion_usuarios_roles;
create policy usuarios_roles_select on public.gestion_usuarios_roles for select
  using(tenant_id = public.tenant_id());

drop policy if exists usuarios_roles_insert on public.gestion_usuarios_roles;
create policy usuarios_roles_insert on public.gestion_usuarios_roles for insert
  with check(tenant_id = public.tenant_id());

drop policy if exists usuarios_roles_delete on public.gestion_usuarios_roles;
create policy usuarios_roles_delete on public.gestion_usuarios_roles for delete
  using(tenant_id = public.tenant_id());

create index if not exists usuarios_roles_usuario_idx on public.gestion_usuarios_roles(usuario_id);
create index if not exists usuarios_roles_rol_idx on public.gestion_usuarios_roles(rol_id);
create index if not exists usuarios_roles_tenant_idx on public.gestion_usuarios_roles(tenant_id);

-- RPC function for permission checking
create or replace function public.tiene_permiso(permiso text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  usuario_id uuid;
  permisos_array jsonb;
  resultado boolean;
begin
  usuario_id := auth.uid();
  if usuario_id is null then
    return false;
  end if;

  -- Get all roles for the user and their permissions
  select jsonb_agg(distinct r.permisos)
  into permisos_array
  from public.gestion_usuarios_roles ur
  join public.roles r on ur.rol_id = r.id
  where ur.usuario_id = usuario_id and ur.tenant_id = public.tenant_id();

  -- Check if permission exists in the aggregated permissions
  resultado := false;
  if permisos_array is not null then
    resultado := (permiso::jsonb @> permisos_array) or
                 (permisos_array @> jsonb_build_array(permiso));
  end if;

  return resultado;
end;
$$;

-- Timestamp update triggers
create or replace function public.actualizar_roles_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists roles_actualizar_timestamp on public.roles;
create trigger roles_actualizar_timestamp before update on public.roles
  for each row execute function public.actualizar_roles_timestamp();

create or replace function public.actualizar_sucursales_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists sucursales_actualizar_timestamp on public.sucursales;
create trigger sucursales_actualizar_timestamp before update on public.sucursales
  for each row execute function public.actualizar_sucursales_timestamp();
