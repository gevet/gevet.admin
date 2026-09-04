-- GeVet: instalación integral para un proyecto Supabase nuevo.
-- Ejecutar una sola vez desde SQL Editor. Es idempotente y no contiene datos de ninguna clínica.
begin;
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create table if not exists public.planes_saas (
 id uuid primary key default gen_random_uuid(), nombre text not null unique, precio_mensual numeric(12,2) not null default 0,
 precio_anual numeric(12,2) not null default 0, max_usuarios integer, max_sucursales integer, max_mascotas integer,
 modulos_incluidos jsonb not null default '[]', activo boolean not null default true, creado_en timestamptz not null default now()
);
create table if not exists public.tenants (
 id uuid primary key default gen_random_uuid(), nombre_comercial text not null, razon_social text, slug text not null unique,
 cuit text, email text, telefono text, direccion text, pais text not null default 'AR', timezone text not null default 'America/Argentina/Buenos_Aires',
 moneda text not null default 'ARS', estado text not null default 'trial' check(estado in ('trial','activo','suspendido','cancelado')),
 plan_id uuid references public.planes_saas(id), trial_termina_en timestamptz not null default (now()+interval '14 days'),
 onboarding_completado boolean not null default false, creado_en timestamptz not null default now(), actualizado_en timestamptz
);
create table if not exists public.tenant_branding (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null unique references public.tenants(id) on delete cascade,
 color_primario text not null default '#2563eb', color_secundario text not null default '#0f172a', color_acento text not null default '#14b8a6',
 logo_url text, logo_oscuro_url text, favicon_url text, tipografia text, modo_oscuro_habilitado boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz
);
create table if not exists public.gestion_sucursales (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 nombre text not null, direccion text, telefono text, horarios jsonb not null default '{}', es_principal boolean not null default false,
 activo boolean not null default true, creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid
);
create table if not exists public.gestion_usuarios (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 auth_user_id uuid not null unique references auth.users(id) on delete cascade, nombre text not null, apellido text, email text not null,
 telefono text, dni text, matricula text, especialidad text, foto_url text, sucursal_id uuid references public.gestion_sucursales(id),
 activo boolean not null default true, creado_en timestamptz not null default now(), actualizado_en timestamptz, unique(tenant_id,email)
);

create or replace function public.tenant_id() returns uuid language sql stable security definer set search_path=public,auth as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true)::jsonb->>'tenant_id',''),
 (select tenant_id::text from public.gestion_usuarios where auth_user_id=auth.uid() and activo limit 1))::uuid
$$;
revoke all on function public.tenant_id() from public;
grant execute on function public.tenant_id() to authenticated, service_role;

create table if not exists public.gestion_roles (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 nombre text not null, descripcion text, es_sistema boolean not null default false, activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid, unique(tenant_id,nombre)
);
create table if not exists public.gestion_permisos (
 id uuid primary key default gen_random_uuid(), codigo text not null unique, descripcion text, modulo text not null,
 activo boolean not null default true, creado_en timestamptz not null default now()
);
create table if not exists public.gestion_roles_permisos (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 rol_id uuid not null references public.gestion_roles(id) on delete cascade, permiso_id uuid not null references public.gestion_permisos(id) on delete cascade,
 activo boolean not null default true, creado_en timestamptz not null default now(), creado_por uuid, unique(tenant_id,rol_id,permiso_id)
);
create table if not exists public.gestion_usuarios_roles (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 usuario_id uuid not null references public.gestion_usuarios(id) on delete cascade, rol_id uuid not null references public.gestion_roles(id) on delete cascade,
 activo boolean not null default true, creado_en timestamptz not null default now(), creado_por uuid, unique(tenant_id,usuario_id,rol_id)
);
create or replace function public.tiene_permiso(permiso text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from gestion_usuarios u join gestion_usuarios_roles ur on ur.usuario_id=u.id and ur.activo
 join gestion_roles_permisos rp on rp.rol_id=ur.rol_id and rp.activo join gestion_permisos p on p.id=rp.permiso_id and p.activo
 where u.auth_user_id=auth.uid() and u.tenant_id=public.tenant_id() and (p.codigo=permiso or p.codigo='*'))
$$;

-- Entidades operativas principales. Los campos detalle permiten evolución sin aceptar tenant_id del navegador.
create table if not exists public.gestion_registros (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 tipo text not null, nombre text not null, detalle jsonb not null default '{}', creado_por uuid default auth.uid() references auth.users(id),
 activo boolean not null default true, creado_en timestamptz not null default now(), actualizado_en timestamptz
);
create table if not exists public.gestion_clientes (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 nombre text not null, apellido text not null, dni_cuit text, email text, telefonos text[], direccion text, localidad text, condicion_fiscal text,
 notas text, saldo_cuenta_corriente numeric(14,2) not null default 0, puntos_fidelizacion integer not null default 0,
 acepta_marketing boolean not null default false, origen text, activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid()
);
create table if not exists public.gestion_mascotas (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 cliente_id uuid not null references public.gestion_clientes(id), nombre text not null, especie text not null, raza text, sexo text,
 fecha_nacimiento date, peso_actual numeric(8,3), color text, microchip text, castrado boolean not null default false, foto_url text,
 fallecido boolean not null default false, fecha_fallecimiento date, alergias text, condiciones_preexistentes text,
 activo boolean not null default true, creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid()
);
create table if not exists public.gestion_turnos (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 mascota_id uuid references public.gestion_mascotas(id), cliente_id uuid references public.gestion_clientes(id), veterinario_id uuid references public.gestion_usuarios(id),
 sucursal_id uuid references public.gestion_sucursales(id), servicio text not null, inicio timestamptz not null, fin timestamptz not null,
 estado text not null default 'pendiente' check(estado in ('pendiente','confirmado','en_curso','atendido','ausente','cancelado')),
 color text, notas text, origen text not null default 'mostrador', activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid(), check(fin>inicio)
);
create table if not exists public.gestion_consultas (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 mascota_id uuid not null references public.gestion_mascotas(id), veterinario_id uuid not null references public.gestion_usuarios(id),
 sucursal_id uuid references public.gestion_sucursales(id), fecha timestamptz not null default now(), motivo text not null, anamnesis text,
 examen_fisico jsonb not null default '{}', diagnostico_presuntivo text, diagnostico_definitivo text, tratamiento text, indicaciones text,
 proxima_visita date, estado text not null default 'abierta', activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid()
);
create table if not exists public.gestion_items (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 codigo text, codigo_barras text, nombre text not null, tipo text not null check(tipo in ('producto','servicio')), precio_costo numeric(14,2) not null default 0,
 margen numeric(7,2), precio_venta numeric(14,2) not null default 0, iva numeric(5,2) not null default 21, stock_minimo numeric(14,3) default 0,
 requiere_receta boolean not null default false, es_medicamento boolean not null default false, unidad text,
 activo boolean not null default true, creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid()
);
create table if not exists public.gestion_caja_sesiones (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null default public.tenant_id() references public.tenants(id) on delete cascade,
 sucursal_id uuid references public.gestion_sucursales(id), usuario_apertura_id uuid references public.gestion_usuarios(id), abierta_en timestamptz not null default now(),
 cerrada_en timestamptz, saldo_inicial numeric(14,2) not null default 0, saldo_declarado numeric(14,2), saldo_calculado numeric(14,2), diferencia numeric(14,2),
 estado text not null default 'abierta' check(estado in ('abierta','cerrada')), activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz, creado_por uuid default auth.uid()
);
create table if not exists public.gestion_auditoria (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, usuario_id uuid, tabla text not null, fila_id uuid,
 operacion text not null, antes jsonb, despues jsonb, creado_en timestamptz not null default now()
);

create or replace function public.completar_contexto() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin new.tenant_id:=coalesce(public.tenant_id(),new.tenant_id); if new.creado_por is null then new.creado_por:=auth.uid(); end if; return new; end $$;
create or replace function public.actualizar_fecha() returns trigger language plpgsql as $$ begin new.actualizado_en:=now(); return new; end $$;

-- El contexto se completa en servidor y la fecha de modificación se mantiene automáticamente.
do $$ declare t text; begin
 foreach t in array array['gestion_sucursales','gestion_roles','gestion_roles_permisos','gestion_usuarios_roles','gestion_registros','gestion_clientes','gestion_mascotas','gestion_turnos','gestion_consultas','gestion_items','gestion_caja_sesiones'] loop
  execute format('drop trigger if exists completar_contexto on public.%I',t);
  execute format('create trigger completar_contexto before insert on public.%I for each row execute function public.completar_contexto()',t);
  execute format('drop trigger if exists actualizar_fecha on public.%I',t);
  execute format('create trigger actualizar_fecha before update on public.%I for each row execute function public.actualizar_fecha()',t);
 end loop;
end $$;

insert into public.gestion_permisos(codigo,descripcion,modulo) values
 ('*','Acceso total del propietario','sistema'),
 ('clientes.eliminar','Eliminar clientes','clientes'),
 ('mascotas.eliminar','Eliminar pacientes','mascotas'),
 ('consultas.eliminar','Eliminar consultas','consultas'),
 ('caja.cerrar','Cerrar sesiones de caja','caja'),
 ('reportes.exportar','Exportar reportes','reportes')
on conflict(codigo) do nothing;

-- Índices por tenant y búsquedas frecuentes.
create index if not exists usuarios_tenant_email_idx on public.gestion_usuarios(tenant_id,email);
create index if not exists sucursales_tenant_nombre_idx on public.gestion_sucursales(tenant_id,nombre);
create index if not exists registros_tenant_tipo_fecha_idx on public.gestion_registros(tenant_id,tipo,creado_en desc);
create index if not exists registros_tenant_nombre_idx on public.gestion_registros using gin(nombre gin_trgm_ops);
create index if not exists clientes_tenant_nombre_idx on public.gestion_clientes(tenant_id,nombre,apellido);
create index if not exists mascotas_tenant_nombre_idx on public.gestion_mascotas(tenant_id,nombre);
create index if not exists turnos_tenant_inicio_idx on public.gestion_turnos(tenant_id,inicio);
create index if not exists consultas_tenant_mascota_fecha_idx on public.gestion_consultas(tenant_id,mascota_id,fecha desc);
create index if not exists items_tenant_nombre_idx on public.gestion_items(tenant_id,nombre);
create index if not exists caja_tenant_fecha_idx on public.gestion_caja_sesiones(tenant_id,creado_en desc);
create index if not exists auditoria_tenant_fecha_idx on public.gestion_auditoria(tenant_id,creado_en desc);

-- RLS uniforme; planes y permisos son catálogos globales de solo lectura para usuarios autenticados.
alter table public.planes_saas enable row level security;
alter table public.gestion_permisos enable row level security;
drop policy if exists planes_lectura on public.planes_saas; create policy planes_lectura on public.planes_saas for select to authenticated using(activo);
drop policy if exists permisos_lectura on public.gestion_permisos; create policy permisos_lectura on public.gestion_permisos for select to authenticated using(activo);

do $$ declare t text; begin
 foreach t in array array['tenants','tenant_branding','gestion_sucursales','gestion_usuarios','gestion_roles','gestion_roles_permisos','gestion_usuarios_roles','gestion_registros','gestion_clientes','gestion_mascotas','gestion_turnos','gestion_consultas','gestion_items','gestion_caja_sesiones','gestion_auditoria'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_select',t);
  execute format('create policy %I on public.%I for select to authenticated using (%s)',t||'_select',t,case when t='tenants' then 'id=public.tenant_id()' else 'tenant_id=public.tenant_id()' end);
  if t<>'gestion_auditoria' then
   execute format('drop policy if exists %I on public.%I',t||'_insert',t);
   execute format('create policy %I on public.%I for insert to authenticated with check (%s)',t||'_insert',t,case when t='tenants' then 'id=public.tenant_id()' else 'tenant_id=public.tenant_id()' end);
   execute format('drop policy if exists %I on public.%I',t||'_update',t);
   execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',t||'_update',t,case when t='tenants' then 'id=public.tenant_id()' else 'tenant_id=public.tenant_id()' end,case when t='tenants' then 'id=public.tenant_id()' else 'tenant_id=public.tenant_id()' end);
  end if;
 end loop;
end $$;

-- Alta atómica desde Supabase Auth.
create or replace function public.crear_tenant_desde_auth() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare tid uuid:=gen_random_uuid(); uid uuid; rid uuid; pid uuid; nombre text:=trim(coalesce(new.raw_user_meta_data->>'nombre_comercial','')); slug text;
begin
 if length(nombre)<2 then raise exception 'El nombre comercial es obligatorio'; end if;
 slug:=trim(both '-' from regexp_replace(lower(unaccent(nombre)),'[^a-z0-9]+','-','g'))||'-'||substr(tid::text,1,8);
 insert into tenants(id,nombre_comercial,slug,email) values(tid,nombre,slug,new.email);
 insert into tenant_branding(tenant_id) values(tid);
 insert into gestion_sucursales(tenant_id,nombre,es_principal) values(tid,'Principal',true);
 insert into gestion_usuarios(tenant_id,auth_user_id,nombre,email) values(tid,new.id,nombre,new.email) returning id into uid;
 insert into gestion_roles(tenant_id,nombre,es_sistema) values(tid,'Dueño',true) returning id into rid;
 insert into gestion_usuarios_roles(tenant_id,usuario_id,rol_id) values(tid,uid,rid);
 select id into pid from gestion_permisos where codigo='*';
 insert into gestion_roles_permisos(tenant_id,rol_id,permiso_id) values(tid,rid,pid);
 return new;
end $$;
drop trigger if exists al_crear_usuario_auth on auth.users;
create trigger al_crear_usuario_auth after insert on auth.users for each row execute function public.crear_tenant_desde_auth();

-- Hook opcional: configurar public.custom_access_token_hook en Auth Hooks > Custom Access Token.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare claims jsonb; tid uuid; begin
 select tenant_id into tid from gestion_usuarios where auth_user_id=(event->>'user_id')::uuid and activo limit 1;
 claims:=event->'claims'; if tid is not null then claims:=jsonb_set(claims,'{tenant_id}',to_jsonb(tid)); end if;
 return jsonb_set(event,'{claims}',claims);
end $$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated,anon,public;
grant select on public.gestion_usuarios to supabase_auth_admin;

-- Storage multi-tenant.
insert into storage.buckets(id,name,public) values ('logos','logos',false),('mascotas','mascotas',false),('estudios','estudios',false),('documentos','documentos',false),('firmas','firmas',false) on conflict(id) do nothing;
drop policy if exists storage_tenant_select on storage.objects;
create policy storage_tenant_select on storage.objects for select to authenticated using(bucket_id in ('logos','mascotas','estudios','documentos','firmas') and (storage.foldername(name))[1]=public.tenant_id()::text);
drop policy if exists storage_tenant_insert on storage.objects;
create policy storage_tenant_insert on storage.objects for insert to authenticated with check(bucket_id in ('logos','mascotas','estudios','documentos','firmas') and (storage.foldername(name))[1]=public.tenant_id()::text);
drop policy if exists storage_tenant_update on storage.objects;
create policy storage_tenant_update on storage.objects for update to authenticated using((storage.foldername(name))[1]=public.tenant_id()::text) with check((storage.foldername(name))[1]=public.tenant_id()::text);
drop policy if exists storage_tenant_delete on storage.objects;
create policy storage_tenant_delete on storage.objects for delete to authenticated using((storage.foldername(name))[1]=public.tenant_id()::text);

commit;
