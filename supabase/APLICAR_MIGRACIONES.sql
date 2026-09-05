-- ============================================================
-- GeVet — instalación completa del esquema (migraciones 001 a 013)
--
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: todo es 'create ... if not exists' o 'create or replace',
-- y los INSERT de la 010 viven dentro de funciones, así que se puede
-- correr sobre una base vacía o sobre una a medio instalar.
-- ============================================================


-- ================================================================
-- 001_cimientos.sql
-- ================================================================
create extension if not exists pgcrypto;
create table if not exists public.tenants(id uuid primary key default gen_random_uuid(),nombre_comercial text not null,slug text not null unique,timezone text not null default 'America/Argentina/Buenos_Aires',moneda text not null default 'ARS',estado text not null default 'trial' check(estado in('trial','activo','suspendido','cancelado')),onboarding_completado boolean not null default false,creado_en timestamptz not null default now(),actualizado_en timestamptz);
create table if not exists public.gestion_usuarios(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,auth_user_id uuid not null unique references auth.users(id) on delete cascade,nombre text not null,email text not null,activo boolean not null default true,creado_en timestamptz not null default now(),actualizado_en timestamptz,unique(tenant_id,email));
create table if not exists public.tenant_branding(id uuid primary key default gen_random_uuid(),tenant_id uuid not null unique references public.tenants(id) on delete cascade,color_primario text not null default '#2563eb',color_secundario text not null default '#0f172a',color_acento text not null default '#14b8a6',logo_url text,creado_en timestamptz not null default now(),actualizado_en timestamptz);
create or replace function public.tenant_id() returns uuid language sql stable security definer set search_path=public,auth as $$select coalesce(nullif(current_setting('request.jwt.claims',true)::jsonb->>'tenant_id',''),(select tenant_id::text from public.gestion_usuarios where auth_user_id=auth.uid()))::uuid$$;
alter table public.tenants enable row level security;alter table public.gestion_usuarios enable row level security;alter table public.tenant_branding enable row level security;
drop policy if exists tenants_aislamiento on public.tenants;create policy tenants_aislamiento on public.tenants for all using(id=public.tenant_id()) with check(id=public.tenant_id());
drop policy if exists usuarios_aislamiento on public.gestion_usuarios;create policy usuarios_aislamiento on public.gestion_usuarios for all using(tenant_id=public.tenant_id()) with check(tenant_id=public.tenant_id());
drop policy if exists branding_aislamiento on public.tenant_branding;create policy branding_aislamiento on public.tenant_branding for all using(tenant_id=public.tenant_id()) with check(tenant_id=public.tenant_id());
create index if not exists usuarios_tenant_email_idx on public.gestion_usuarios(tenant_id,email);


-- ================================================================
-- 002_operacion.sql
-- ================================================================
do $$begin create type public.tipo_entidad as enum('cliente','mascota','turno','consulta','item','movimiento_stock','movimiento_caja');exception when duplicate_object then null;end$$;
create table if not exists public.gestion_registros(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,tipo public.tipo_entidad not null,nombre text not null,detalle jsonb not null default '{}',creado_por uuid references auth.users(id),creado_en timestamptz not null default now(),actualizado_en timestamptz,activo boolean not null default true);
alter table public.gestion_registros enable row level security;
drop policy if exists registros_select on public.gestion_registros;create policy registros_select on public.gestion_registros for select using(tenant_id=public.tenant_id());
drop policy if exists registros_insert on public.gestion_registros;create policy registros_insert on public.gestion_registros for insert with check(tenant_id=public.tenant_id() and creado_por=auth.uid());
drop policy if exists registros_update on public.gestion_registros;create policy registros_update on public.gestion_registros for update using(tenant_id=public.tenant_id()) with check(tenant_id=public.tenant_id());
drop policy if exists registros_delete on public.gestion_registros;create policy registros_delete on public.gestion_registros for delete using(tenant_id=public.tenant_id());
create index if not exists registros_tenant_tipo_fecha_idx on public.gestion_registros(tenant_id,tipo,creado_en desc);create index if not exists registros_tenant_nombre_idx on public.gestion_registros(tenant_id,nombre);


-- ================================================================
-- 003_registro_y_contexto.sql
-- ================================================================
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


-- ================================================================
-- 004_catalogo_modulos.sql
-- ================================================================
-- Amplía el catálogo operativo sin modificar migraciones ya aplicadas.
alter type public.tipo_entidad add value if not exists 'clientes';
alter type public.tipo_entidad add value if not exists 'mascotas';
alter type public.tipo_entidad add value if not exists 'consultas';
alter type public.tipo_entidad add value if not exists 'clinica/soap';
alter type public.tipo_entidad add value if not exists 'clinica/vacunas';
alter type public.tipo_entidad add value if not exists 'prescripciones';
alter type public.tipo_entidad add value if not exists 'laboratorio';
alter type public.tipo_entidad add value if not exists 'enfermedades';
alter type public.tipo_entidad add value if not exists 'medicinas';
alter type public.tipo_entidad add value if not exists 'agenda';
alter type public.tipo_entidad add value if not exists 'agenda-telefonico';
alter type public.tipo_entidad add value if not exists 'recepcion/checkin';
alter type public.tipo_entidad add value if not exists 'recepcion/sala-espera';
alter type public.tipo_entidad add value if not exists 'lista-espera';
alter type public.tipo_entidad add value if not exists 'turnos';
alter type public.tipo_entidad add value if not exists 'pos';
alter type public.tipo_entidad add value if not exists 'caja';
alter type public.tipo_entidad add value if not exists 'facturacion';
alter type public.tipo_entidad add value if not exists 'pagos';
alter type public.tipo_entidad add value if not exists 'contabilidad';
alter type public.tipo_entidad add value if not exists 'inventario';
alter type public.tipo_entidad add value if not exists 'inventario/lotes';
alter type public.tipo_entidad add value if not exists 'items';
alter type public.tipo_entidad add value if not exists 'stock';
alter type public.tipo_entidad add value if not exists 'proveedores';
alter type public.tipo_entidad add value if not exists 'compras';
alter type public.tipo_entidad add value if not exists 'ordenes-compra';
alter type public.tipo_entidad add value if not exists 'remitos';
alter type public.tipo_entidad add value if not exists 'pedidos';
alter type public.tipo_entidad add value if not exists 'peluqueria';
alter type public.tipo_entidad add value if not exists 'guarderia';
alter type public.tipo_entidad add value if not exists 'planes-salud';
alter type public.tipo_entidad add value if not exists 'fidelizacion';
alter type public.tipo_entidad add value if not exists 'promociones';
alter type public.tipo_entidad add value if not exists 'marketing';
alter type public.tipo_entidad add value if not exists 'notificaciones';
alter type public.tipo_entidad add value if not exists 'notificaciones-avanzadas';
alter type public.tipo_entidad add value if not exists 'recordatorios';
alter type public.tipo_entidad add value if not exists 'reclamos';
alter type public.tipo_entidad add value if not exists 'documentos';
alter type public.tipo_entidad add value if not exists 'rrhh';
alter type public.tipo_entidad add value if not exists 'staff';
alter type public.tipo_entidad add value if not exists 'usuarios';
alter type public.tipo_entidad add value if not exists 'roles';
alter type public.tipo_entidad add value if not exists 'sucursales';
alter type public.tipo_entidad add value if not exists 'reportes';
alter type public.tipo_entidad add value if not exists 'analytics';
alter type public.tipo_entidad add value if not exists 'bi-avanzado';
alter type public.tipo_entidad add value if not exists 'auditoria';
alter type public.tipo_entidad add value if not exists 'workflows';
alter type public.tipo_entidad add value if not exists 'integraciones';
alter type public.tipo_entidad add value if not exists 'marketplace';
alter type public.tipo_entidad add value if not exists 'configuracion';
alter type public.tipo_entidad add value if not exists 'configuracion/colores';
alter type public.tipo_entidad add value if not exists 'configuracion/modulos';


-- ================================================================
-- 005_normalizar_clientes.sql
-- ================================================================
-- Phase 3: Database normalization - Clientes table
-- Replaces generic gestion_registros entries of tipo='clientes' with normalized structure

create table if not exists public.clientes(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  -- Identificación
  tipo_documento text not null check(tipo_documento in('DNI','CUIT','CUIL','PASAPORTE','OTRO')),
  numero_documento text not null,

  -- Datos personales
  nombre text not null,
  apellido text not null,
  razon_social text,
  email text,
  telefono text,
  celular text,

  -- Dirección
  direccion text,
  numero_calle text,
  apartamento text,
  ciudad text,
  provincia text,
  codigo_postal text,
  pais text not null default 'Argentina',

  -- Datos comerciales
  responsable_iva boolean not null default false,
  condicion_iva text check(condicion_iva in('Consumidor Final','Responsable Inscripto','Responsable No Inscripto','Exento','No Categorizado')),

  -- Observaciones y estado
  observaciones text,
  activo boolean not null default true,

  -- Auditoría
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,

  unique(tenant_id, numero_documento)
);

alter table public.clientes enable row level security;

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select
  using(tenant_id = public.tenant_id());

drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert
  with check(tenant_id = public.tenant_id() and creado_por = auth.uid());

drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete
  using(tenant_id = public.tenant_id());

-- Índices para consultas comunes
create index if not exists clientes_tenant_numero_documento_idx on public.clientes(tenant_id, numero_documento);
create index if not exists clientes_tenant_nombre_idx on public.clientes(tenant_id, nombre, apellido);
create index if not exists clientes_tenant_email_idx on public.clientes(tenant_id, email) where email is not null;
create index if not exists clientes_tenant_celular_idx on public.clientes(tenant_id, celular) where celular is not null;
create index if not exists clientes_tenant_activo_idx on public.clientes(tenant_id, activo);

-- Trigger para actualizar actualizado_en
create or replace function public.actualizar_clientes_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists clientes_actualizar_timestamp on public.clientes;
create trigger clientes_actualizar_timestamp before update on public.clientes
  for each row execute function public.actualizar_clientes_timestamp();


-- ================================================================
-- 006_normalizar_mascotas.sql
-- ================================================================
-- Phase 3: Database normalization - Mascotas table
-- Replaces generic gestion_registros entries of tipo='mascotas' with normalized structure

create table if not exists public.mascotas(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,

  -- Datos básicos
  nombre text not null,
  especie text not null check(especie in('Perro','Gato','Conejo','Roedor','Ave','Reptil','Otro')),
  raza text,
  sexo text check(sexo in('Macho','Hembra','Desconocido')),

  -- Identificación
  microchip text unique,
  numero_tatuaje text,

  -- Características
  color text,
  peso_kg numeric(5,2),
  fecha_nacimiento date,
  foto_url text,

  -- Antecedentes médicos
  alergias text,
  condiciones_cronicas text,
  observaciones text,

  -- Estado
  activo boolean not null default true,

  -- Auditoría
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.mascotas enable row level security;

drop policy if exists mascotas_select on public.mascotas;
create policy mascotas_select on public.mascotas for select
  using(tenant_id = public.tenant_id());

drop policy if exists mascotas_insert on public.mascotas;
create policy mascotas_insert on public.mascotas for insert
  with check(tenant_id = public.tenant_id() and creado_por = auth.uid());

drop policy if exists mascotas_update on public.mascotas;
create policy mascotas_update on public.mascotas for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists mascotas_delete on public.mascotas;
create policy mascotas_delete on public.mascotas for delete
  using(tenant_id = public.tenant_id());

-- Índices para consultas comunes
create index if not exists mascotas_tenant_cliente_idx on public.mascotas(tenant_id, cliente_id);
create index if not exists mascotas_tenant_nombre_idx on public.mascotas(tenant_id, nombre);
create index if not exists mascotas_tenant_microchip_idx on public.mascotas(tenant_id, microchip) where microchip is not null;
create index if not exists mascotas_tenant_activo_idx on public.mascotas(tenant_id, activo);

-- Trigger para actualizar actualizado_en
create or replace function public.actualizar_mascotas_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists mascotas_actualizar_timestamp on public.mascotas;
create trigger mascotas_actualizar_timestamp before update on public.mascotas
  for each row execute function public.actualizar_mascotas_timestamp();


-- ================================================================
-- 007_normalizar_turnos.sql
-- ================================================================
-- Phase 3: Database normalization - Turnos table
-- Replaces generic gestion_registros entries of tipo='turnos' with normalized structure

create table if not exists public.turnos(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mascota_id uuid not null references public.mascotas(id) on delete cascade,

  -- Profesional asignado
  profesional_id uuid references public.gestion_usuarios(id) on delete set null,

  -- Cita
  fecha_hora timestamptz not null,
  duracion_minutos integer not null default 30,

  -- Motivo y detalles
  motivo text not null,
  notas text,

  -- Estado del turno
  estado text not null check(estado in('Pendiente','Confirmado','En Progreso','Completado','Cancelado','No-Show')),
  razon_cancelacion text,

  -- Observaciones
  observaciones text,

  -- Auditoría
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.turnos enable row level security;

drop policy if exists turnos_select on public.turnos;
create policy turnos_select on public.turnos for select
  using(tenant_id = public.tenant_id());

drop policy if exists turnos_insert on public.turnos;
create policy turnos_insert on public.turnos for insert
  with check(tenant_id = public.tenant_id() and creado_por = auth.uid());

drop policy if exists turnos_update on public.turnos;
create policy turnos_update on public.turnos for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists turnos_delete on public.turnos;
create policy turnos_delete on public.turnos for delete
  using(tenant_id = public.tenant_id());

-- Índices para consultas comunes
create index if not exists turnos_tenant_cliente_idx on public.turnos(tenant_id, cliente_id);
create index if not exists turnos_tenant_mascota_idx on public.turnos(tenant_id, mascota_id);
create index if not exists turnos_tenant_profesional_idx on public.turnos(tenant_id, profesional_id);
create index if not exists turnos_tenant_fecha_idx on public.turnos(tenant_id, fecha_hora);
create index if not exists turnos_tenant_estado_idx on public.turnos(tenant_id, estado);
create index if not exists turnos_tenant_fecha_estado_idx on public.turnos(tenant_id, fecha_hora, estado);

-- Trigger para actualizar actualizado_en
create or replace function public.actualizar_turnos_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists turnos_actualizar_timestamp on public.turnos;
create trigger turnos_actualizar_timestamp before update on public.turnos
  for each row execute function public.actualizar_turnos_timestamp();


-- ================================================================
-- 008_normalizar_consultas.sql
-- ================================================================
-- Phase 3: Database normalization - Consultas table
-- Replaces generic gestion_registros entries of tipo='consultas' with normalized structure
-- Implements SOAP format for clinical notes (Subjective, Objective, Assessment, Plan)

create table if not exists public.consultas(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  turno_id uuid not null references public.turnos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mascota_id uuid not null references public.mascotas(id) on delete cascade,
  profesional_id uuid not null references public.gestion_usuarios(id) on delete restrict,

  -- Notas SOAP (Subjective, Objective, Assessment, Plan)
  subjetivo text,
  objetivo text,
  evaluacion text not null,
  plan text not null,

  -- Signos vitales y medidas
  temperatura_celsius numeric(4,1),
  frecuencia_cardiaca_bpm integer,
  frecuencia_respiratoria_rpm integer,
  peso_kg numeric(5,2),

  -- Diagnóstico y tratamiento
  diagnostico text,
  prescripciones text,

  -- Observaciones y referencias
  observaciones text,
  referencia_a_especialista text,

  -- Auditoría
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.consultas enable row level security;

drop policy if exists consultas_select on public.consultas;
create policy consultas_select on public.consultas for select
  using(tenant_id = public.tenant_id());

drop policy if exists consultas_insert on public.consultas;
create policy consultas_insert on public.consultas for insert
  with check(tenant_id = public.tenant_id() and creado_por = auth.uid());

drop policy if exists consultas_update on public.consultas;
create policy consultas_update on public.consultas for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists consultas_delete on public.consultas;
create policy consultas_delete on public.consultas for delete
  using(tenant_id = public.tenant_id());

-- Índices para consultas comunes
create index if not exists consultas_tenant_turno_idx on public.consultas(tenant_id, turno_id);
create index if not exists consultas_tenant_cliente_idx on public.consultas(tenant_id, cliente_id);
create index if not exists consultas_tenant_mascota_idx on public.consultas(tenant_id, mascota_id);
create index if not exists consultas_tenant_profesional_idx on public.consultas(tenant_id, profesional_id);
create index if not exists consultas_tenant_fecha_idx on public.consultas(tenant_id, creado_en desc);

-- Trigger para actualizar actualizado_en
create or replace function public.actualizar_consultas_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists consultas_actualizar_timestamp on public.consultas;
create trigger consultas_actualizar_timestamp before update on public.consultas
  for each row execute function public.actualizar_consultas_timestamp();


-- ================================================================
-- 009_estructura_roles_sucursales.sql
-- ================================================================
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


-- ================================================================
-- 010_migracion_datos_normalizacion.sql
-- ================================================================
-- Phase 3: Data migration from gestion_registros to normalized tables
-- This migration handles the transition from the JSONB-based anti-pattern to proper normalized schema

-- First, add trial_termina_en to tenants if it doesn't exist (for trial expiry checking)
alter table public.tenants add column if not exists trial_termina_en timestamptz default (now() + interval '15 days');

-- Migration helper: Extract client data from gestion_registros tipo='clientes'
-- This is a data migration strategy that allows gradual transition
-- Production strategy: Run as a background job during low-traffic hours

create or replace function public.migrar_cliente_desde_registro(
  p_registro_id uuid,
  p_detalle jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cliente_id uuid;
  v_tenant_id uuid;
  v_creado_por uuid;
begin
  -- Extract context from current request
  v_tenant_id := public.tenant_id();
  v_creado_por := auth.uid();

  -- Extract and validate data from detalle JSONB
  -- Expected structure: {
  --   "nombre": "...",
  --   "apellido": "...",
  --   "email": "...",
  --   "telefono": "...",
  --   "tipo_documento": "DNI|CUIT|...",
  --   "numero_documento": "...",
  --   ...other fields
  -- }

  insert into public.clientes(
    tenant_id,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    email,
    telefono,
    ciudad,
    provincia,
    creado_por,
    creado_en
  )
  values (
    v_tenant_id,
    coalesce(p_detalle->>'tipo_documento', 'OTRO'),
    coalesce(p_detalle->>'numero_documento', ''),
    coalesce(p_detalle->>'nombre', 'Sin nombre'),
    coalesce(p_detalle->>'apellido', ''),
    nullif(p_detalle->>'email', ''),
    nullif(p_detalle->>'telefono', ''),
    nullif(p_detalle->>'ciudad', ''),
    nullif(p_detalle->>'provincia', ''),
    v_creado_por,
    now()
  )
  returning id into v_cliente_id;

  return v_cliente_id;
exception when others then
  -- Log error but don't fail the migration
  raise warning 'Error migrating cliente from registro %: %', p_registro_id, sqlerrm;
  return null;
end;
$$;

-- Migration helper: Extract pet data from gestion_registros tipo='mascotas'
create or replace function public.migrar_mascota_desde_registro(
  p_registro_id uuid,
  p_cliente_id uuid,
  p_detalle jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_mascota_id uuid;
  v_tenant_id uuid;
  v_creado_por uuid;
begin
  v_tenant_id := public.tenant_id();
  v_creado_por := auth.uid();

  insert into public.mascotas(
    tenant_id,
    cliente_id,
    nombre,
    especie,
    raza,
    sexo,
    color,
    creado_por,
    creado_en
  )
  values (
    v_tenant_id,
    p_cliente_id,
    coalesce(p_detalle->>'nombre', 'Sin nombre'),
    coalesce(p_detalle->>'especie', 'Otro'),
    nullif(p_detalle->>'raza', ''),
    nullif(p_detalle->>'sexo', ''),
    nullif(p_detalle->>'color', ''),
    v_creado_por,
    now()
  )
  returning id into v_mascota_id;

  return v_mascota_id;
exception when others then
  raise warning 'Error migrating mascota from registro %: %', p_registro_id, sqlerrm;
  return null;
end;
$$;

-- View for audit trail of legacy data still in gestion_registros
create or replace view public.registros_legados_pendientes_migracion as
select
  id,
  tenant_id,
  tipo,
  nombre,
  detalle,
  creado_en
from public.gestion_registros
where tipo in ('clientes', 'mascotas', 'turnos', 'consultas')
and creado_en > now() - interval '30 days'
order by creado_en desc;

-- Function to enable admin to trigger batch migration
create or replace function public.migrar_registros_legados_en_lote(
  p_tipo public.tipo_entidad,
  p_limite integer default 100
)
returns table(migrados integer, errores integer)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_migrados integer := 0;
  v_errores integer := 0;
  v_registro record;
  v_cliente_id uuid;
begin
  -- Only allow admins to run batch migrations
  -- This should be called from admin interface with additional auth checks

  for v_registro in
    select id, tenant_id, nombre, detalle, creado_por
    from public.gestion_registros
    where tipo = p_tipo
    and tenant_id = public.tenant_id()
    limit p_limite
  loop
    begin
      if p_tipo = 'clientes'::public.tipo_entidad then
        if public.migrar_cliente_desde_registro(v_registro.id, v_registro.detalle) is not null then
          v_migrados := v_migrados + 1;
        else
          v_errores := v_errores + 1;
        end if;
      end if;
      -- Additional type handlers can be added here
    exception when others then
      v_errores := v_errores + 1;
    end;
  end loop;

  return query select v_migrados, v_errores;
end;
$$;

-- Default roles for new tenants
-- These are inserted via trigger when a tenant is created
create or replace function public.crear_roles_por_defecto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.roles(tenant_id, nombre, descripcion, permisos)
  values
    (new.id, 'Administrador', 'Acceso completo al sistema', '["usuarios.invitar", "usuarios.editar", "configuracion.editar"]'::jsonb),
    (new.id, 'Veterinario', 'Acceso a consultas y pacientes', '["consultas.crear", "consultas.editar", "mascotas.ver"]'::jsonb),
    (new.id, 'Recepcionista', 'Acceso a turnos y clientes', '["turnos.crear", "turnos.editar", "clientes.ver"]'::jsonb),
    (new.id, 'Visualizador', 'Acceso de solo lectura', '["ver_reportes"]'::jsonb);
  return new;
end;
$$;

drop trigger if exists crear_roles_default_tenant on public.tenants;
create trigger crear_roles_default_tenant after insert on public.tenants
  for each row execute function public.crear_roles_por_defecto();

-- Default sucursal for new tenants
create or replace function public.crear_sucursal_por_defecto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sucursales(tenant_id, nombre, direccion, horario_apertura, horario_cierre)
  values (new.id, 'Principal', null, '08:00'::time, '20:00'::time);
  return new;
end;
$$;

drop trigger if exists crear_sucursal_default_tenant on public.tenants;
create trigger crear_sucursal_default_tenant after insert on public.tenants
  for each row execute function public.crear_sucursal_por_defecto();

-- Mark this migration as complete for audit purposes
-- In production, track schema version in tenants table or separate table
comment on table public.clientes is 'Phase 3: Normalized clientes table (replaces gestion_registros tipo=clientes)';
comment on table public.mascotas is 'Phase 3: Normalized mascotas table (replaces gestion_registros tipo=mascotas)';
comment on table public.turnos is 'Phase 3: Normalized turnos table (replaces gestion_registros tipo=turnos)';
comment on table public.consultas is 'Phase 3: Normalized consultas table (replaces gestion_registros tipo=consultas)';


-- ================================================================
-- 011_productos_y_ventas.sql
-- ================================================================
-- Phase 4: Productos (Inventory) and Ventas (Sales) for veterinary clinic operations

-- Productos table
create table if not exists public.productos(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio_venta numeric(12,2) not null,
  precio_costo numeric(12,2),
  stock_cantidad integer not null default 0,
  unidad text not null default 'Unidad', -- Unidad, mg, ml, cc, etc.
  categoria text, -- Medicamentos, Alimentos, Accesorios, Servicios, etc.
  codigo_barras text,
  proveedor text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, nombre)
);

alter table public.productos enable row level security;

drop policy if exists productos_select on public.productos;
create policy productos_select on public.productos for select
  using(tenant_id = public.tenant_id());

drop policy if exists productos_insert on public.productos;
create policy productos_insert on public.productos for insert
  with check(tenant_id = public.tenant_id());

drop policy if exists productos_update on public.productos;
create policy productos_update on public.productos for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists productos_delete on public.productos;
create policy productos_delete on public.productos for delete
  using(tenant_id = public.tenant_id());

create index if not exists productos_tenant_activo_idx on public.productos(tenant_id, activo);
create index if not exists productos_categoria_idx on public.productos(categoria);

-- Ventas table (Sales/Line items from consultations)
create table if not exists public.ventas(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consulta_id uuid references public.consultas(id) on delete set null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad integer not null,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  descuento_porcentaje numeric(5,2) not null default 0,
  descuento_monto numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  metodo_pago text not null default 'Contado', -- Contado, Tarjeta, Transferencia, Cuenta Corriente
  estado text not null default 'Completada' check(estado in('Pendiente','Completada','Cancelada')),
  referencia_comprobante text,
  observaciones text,
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.ventas enable row level security;

drop policy if exists ventas_select on public.ventas;
create policy ventas_select on public.ventas for select
  using(tenant_id = public.tenant_id());

drop policy if exists ventas_insert on public.ventas;
create policy ventas_insert on public.ventas for insert
  with check(tenant_id = public.tenant_id());

drop policy if exists ventas_update on public.ventas;
create policy ventas_update on public.ventas for update
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

drop policy if exists ventas_delete on public.ventas;
create policy ventas_delete on public.ventas for delete
  using(tenant_id = public.tenant_id());

create index if not exists ventas_tenant_cliente_idx on public.ventas(tenant_id, cliente_id);
create index if not exists ventas_consulta_idx on public.ventas(consulta_id);
create index if not exists ventas_fecha_idx on public.ventas(creado_en);

-- Timestamp update triggers
create or replace function public.actualizar_productos_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists productos_actualizar_timestamp on public.productos;
create trigger productos_actualizar_timestamp before update on public.productos
  for each row execute function public.actualizar_productos_timestamp();

create or replace function public.actualizar_ventas_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists ventas_actualizar_timestamp on public.ventas;
create trigger ventas_actualizar_timestamp before update on public.ventas
  for each row execute function public.actualizar_ventas_timestamp();

-- Function to create or update account movement when sale is completed
create or replace function public.procesar_venta_en_cuenta_corriente()
returns trigger language plpgsql security definer as $$
declare
  v_cuenta_id uuid;
  v_saldo_anterior numeric;
  v_nuevo_saldo numeric;
begin
  if new.estado = 'Completada' and (old.estado is null or old.estado != 'Completada') then
    -- Find or create cuenta_corriente for cliente
    insert into public.cuentas_corrientes (tenant_id, cliente_id, saldo_deuda, saldo_favor, limite_credito, condicion_pago, dias_de_gracia, activo)
    values (new.tenant_id, new.cliente_id, 0, 0, 0, 'Contado', 0, true)
    on conflict (cliente_id) do nothing;

    select id into v_cuenta_id from public.cuentas_corrientes where cliente_id = new.cliente_id limit 1;

    if v_cuenta_id is not null then
      select saldo_deuda into v_saldo_anterior from public.cuentas_corrientes where id = v_cuenta_id;
      v_nuevo_saldo := v_saldo_anterior + new.total;

      -- If paid in cash, don't create debt
      if new.metodo_pago = 'Contado' then
        v_nuevo_saldo := v_saldo_anterior;
      else
        -- Create account movement for credit sales
        insert into public.movimientos_cuentas_corrientes (tenant_id, cliente_id, cuenta_corriente_id, tipo, monto, saldo_anterior, saldo_nuevo, referencia_tipo, referencia_id, descripcion)
        values (new.tenant_id, new.cliente_id, v_cuenta_id, 'Cargo', new.total, v_saldo_anterior, v_nuevo_saldo, 'Venta', new.id, 'Venta #' || new.id);

        update public.cuentas_corrientes set saldo_deuda = v_nuevo_saldo where id = v_cuenta_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists procesar_venta_trigger on public.ventas;
create trigger procesar_venta_trigger after insert or update on public.ventas
  for each row execute function public.procesar_venta_en_cuenta_corriente();


-- ================================================================
-- 012_compras_contabilidad_laboratorio_recepcion.sql
-- ================================================================
-- Phase 5: Compras, Contabilidad, Laboratorio y Recepción (check-in)

-- ---------------------------------------------------------------------------
-- Helper: correlative numbering per tenant and document type
-- ---------------------------------------------------------------------------
create table if not exists public.secuencias(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null,
  ultimo_numero integer not null default 0,
  unique(tenant_id, tipo)
);

alter table public.secuencias enable row level security;

drop policy if exists secuencias_all on public.secuencias;
create policy secuencias_all on public.secuencias for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create or replace function public.siguiente_numero(p_tenant_id uuid, p_tipo text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_numero integer;
begin
  insert into public.secuencias(tenant_id, tipo, ultimo_numero)
  values (p_tenant_id, p_tipo, 1)
  on conflict (tenant_id, tipo)
  do update set ultimo_numero = public.secuencias.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;

-- ---------------------------------------------------------------------------
-- COMPRAS: proveedores, órdenes de compra y sus ítems
-- ---------------------------------------------------------------------------
create table if not exists public.proveedores(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  razon_social text not null,
  nombre_fantasia text,
  cuit text,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  provincia text,
  contacto text,
  condicion_pago text not null default 'Contado',
  observaciones text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, razon_social)
);

alter table public.proveedores enable row level security;

drop policy if exists proveedores_all on public.proveedores;
create policy proveedores_all on public.proveedores for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists proveedores_tenant_activo_idx on public.proveedores(tenant_id, activo);

create table if not exists public.ordenes_compra(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  proveedor_id uuid not null references public.proveedores(id) on delete restrict,
  numero integer not null,
  fecha date not null default current_date,
  fecha_entrega_estimada date,
  estado text not null default 'Borrador'
    check(estado in('Borrador','Enviada','Recibida Parcial','Recibida','Cancelada')),
  subtotal numeric(12,2) not null default 0,
  impuestos numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  observaciones text,
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, numero)
);

alter table public.ordenes_compra enable row level security;

drop policy if exists ordenes_compra_all on public.ordenes_compra;
create policy ordenes_compra_all on public.ordenes_compra for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists ordenes_compra_tenant_estado_idx on public.ordenes_compra(tenant_id, estado);
create index if not exists ordenes_compra_proveedor_idx on public.ordenes_compra(proveedor_id);

create table if not exists public.ordenes_compra_items(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  orden_id uuid not null references public.ordenes_compra(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad integer not null check(cantidad > 0),
  cantidad_recibida integer not null default 0,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  creado_en timestamptz not null default now()
);

alter table public.ordenes_compra_items enable row level security;

drop policy if exists ordenes_compra_items_all on public.ordenes_compra_items;
create policy ordenes_compra_items_all on public.ordenes_compra_items for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists ordenes_compra_items_orden_idx on public.ordenes_compra_items(orden_id);

-- ---------------------------------------------------------------------------
-- CONTABILIDAD: plan de cuentas, asientos y líneas
-- ---------------------------------------------------------------------------
create table if not exists public.plan_cuentas(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  tipo text not null check(tipo in('Activo','Pasivo','Patrimonio','Ingreso','Egreso')),
  imputable boolean not null default true,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, codigo)
);

alter table public.plan_cuentas enable row level security;

drop policy if exists plan_cuentas_all on public.plan_cuentas;
create policy plan_cuentas_all on public.plan_cuentas for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists plan_cuentas_tenant_tipo_idx on public.plan_cuentas(tenant_id, tipo);

create table if not exists public.asientos_contables(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  numero integer not null,
  fecha date not null default current_date,
  descripcion text not null,
  referencia_tipo text,
  referencia_id uuid,
  total_debe numeric(12,2) not null default 0,
  total_haber numeric(12,2) not null default 0,
  estado text not null default 'Registrado'
    check(estado in('Borrador','Registrado','Anulado')),
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, numero)
);

alter table public.asientos_contables enable row level security;

drop policy if exists asientos_contables_all on public.asientos_contables;
create policy asientos_contables_all on public.asientos_contables for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists asientos_tenant_fecha_idx on public.asientos_contables(tenant_id, fecha);

create table if not exists public.asientos_lineas(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asiento_id uuid not null references public.asientos_contables(id) on delete cascade,
  cuenta_id uuid not null references public.plan_cuentas(id) on delete restrict,
  debe numeric(12,2) not null default 0,
  haber numeric(12,2) not null default 0,
  descripcion text,
  creado_en timestamptz not null default now(),
  check(debe >= 0 and haber >= 0),
  check(not (debe > 0 and haber > 0))
);

alter table public.asientos_lineas enable row level security;

drop policy if exists asientos_lineas_all on public.asientos_lineas;
create policy asientos_lineas_all on public.asientos_lineas for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists asientos_lineas_asiento_idx on public.asientos_lineas(asiento_id);
create index if not exists asientos_lineas_cuenta_idx on public.asientos_lineas(cuenta_id);

-- ---------------------------------------------------------------------------
-- LABORATORIO: catálogo de estudios, órdenes e ítems con resultados
-- ---------------------------------------------------------------------------
create table if not exists public.estudios_laboratorio(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text,
  nombre text not null,
  categoria text,
  precio numeric(12,2) not null default 0,
  unidad text,
  valor_referencia_min numeric(12,3),
  valor_referencia_max numeric(12,3),
  tiempo_entrega_horas integer not null default 24,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, nombre)
);

alter table public.estudios_laboratorio enable row level security;

drop policy if exists estudios_laboratorio_all on public.estudios_laboratorio;
create policy estudios_laboratorio_all on public.estudios_laboratorio for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists estudios_tenant_activo_idx on public.estudios_laboratorio(tenant_id, activo);

create table if not exists public.ordenes_laboratorio(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consulta_id uuid references public.consultas(id) on delete set null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mascota_id uuid not null references public.mascotas(id) on delete cascade,
  numero integer not null,
  fecha date not null default current_date,
  estado text not null default 'Solicitada'
    check(estado in('Solicitada','En Proceso','Completada','Cancelada')),
  prioridad text not null default 'Normal'
    check(prioridad in('Normal','Urgente')),
  total numeric(12,2) not null default 0,
  observaciones text,
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, numero)
);

alter table public.ordenes_laboratorio enable row level security;

drop policy if exists ordenes_laboratorio_all on public.ordenes_laboratorio;
create policy ordenes_laboratorio_all on public.ordenes_laboratorio for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists ordenes_lab_tenant_estado_idx on public.ordenes_laboratorio(tenant_id, estado);
create index if not exists ordenes_lab_mascota_idx on public.ordenes_laboratorio(mascota_id);

create table if not exists public.ordenes_laboratorio_items(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  orden_id uuid not null references public.ordenes_laboratorio(id) on delete cascade,
  estudio_id uuid not null references public.estudios_laboratorio(id) on delete restrict,
  precio numeric(12,2) not null default 0,
  resultado text,
  valor_numerico numeric(12,3),
  unidad text,
  fuera_de_rango boolean,
  observaciones text,
  fecha_resultado timestamptz,
  creado_en timestamptz not null default now()
);

alter table public.ordenes_laboratorio_items enable row level security;

drop policy if exists ordenes_laboratorio_items_all on public.ordenes_laboratorio_items;
create policy ordenes_laboratorio_items_all on public.ordenes_laboratorio_items for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists ordenes_lab_items_orden_idx on public.ordenes_laboratorio_items(orden_id);

-- ---------------------------------------------------------------------------
-- RECEPCIÓN: check-in y sala de espera
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  turno_id uuid references public.turnos(id) on delete set null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mascota_id uuid not null references public.mascotas(id) on delete cascade,
  numero integer not null,
  estado text not null default 'En Espera'
    check(estado in('En Espera','Llamado','En Atención','Finalizado','Ausente')),
  prioridad text not null default 'Normal'
    check(prioridad in('Normal','Urgente','Emergencia')),
  motivo text,
  box text,
  profesional_id uuid,
  hora_llegada timestamptz not null default now(),
  hora_llamado timestamptz,
  hora_atencion timestamptz,
  hora_salida timestamptz,
  observaciones text,
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  unique(tenant_id, numero)
);

alter table public.check_ins enable row level security;

drop policy if exists check_ins_all on public.check_ins;
create policy check_ins_all on public.check_ins for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists check_ins_tenant_estado_idx on public.check_ins(tenant_id, estado);
create index if not exists check_ins_llegada_idx on public.check_ins(hora_llegada);

-- ---------------------------------------------------------------------------
-- Timestamp triggers
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_timestamp_generico()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists proveedores_ts on public.proveedores;
create trigger proveedores_ts before update on public.proveedores
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists ordenes_compra_ts on public.ordenes_compra;
create trigger ordenes_compra_ts before update on public.ordenes_compra
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists plan_cuentas_ts on public.plan_cuentas;
create trigger plan_cuentas_ts before update on public.plan_cuentas
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists asientos_contables_ts on public.asientos_contables;
create trigger asientos_contables_ts before update on public.asientos_contables
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists estudios_laboratorio_ts on public.estudios_laboratorio;
create trigger estudios_laboratorio_ts before update on public.estudios_laboratorio
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists ordenes_laboratorio_ts on public.ordenes_laboratorio;
create trigger ordenes_laboratorio_ts before update on public.ordenes_laboratorio
  for each row execute function public.actualizar_timestamp_generico();

drop trigger if exists check_ins_ts on public.check_ins;
create trigger check_ins_ts before update on public.check_ins
  for each row execute function public.actualizar_timestamp_generico();

-- ---------------------------------------------------------------------------
-- Recepción de mercadería: al marcar una orden como Recibida, sumar stock
-- ---------------------------------------------------------------------------
create or replace function public.procesar_recepcion_orden_compra()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item record;
begin
  if new.estado = 'Recibida' and (old.estado is null or old.estado <> 'Recibida') then
    for v_item in
      select producto_id, cantidad, cantidad_recibida
      from public.ordenes_compra_items
      where orden_id = new.id
    loop
      -- Reconcile stock with the full ordered quantity that was not yet received
      update public.productos
      set stock_cantidad = stock_cantidad + (v_item.cantidad - v_item.cantidad_recibida)
      where id = v_item.producto_id;
    end loop;

    update public.ordenes_compra_items
    set cantidad_recibida = cantidad
    where orden_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists recepcion_orden_compra_trigger on public.ordenes_compra;
create trigger recepcion_orden_compra_trigger after update on public.ordenes_compra
  for each row execute function public.procesar_recepcion_orden_compra();


-- ================================================================
-- 013_cuentas_corrientes.sql
-- ================================================================
-- Phase 6: Cuentas corrientes (accounts receivable)
--
-- These tables were referenced by the sales trigger in migration 011 but were
-- never created, so every completed sale failed. This creates them and fixes
-- the trigger so a current account is only opened for credit sales.

create table if not exists public.cuentas_corrientes(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null unique references public.clientes(id) on delete cascade,
  saldo_deuda numeric(12,2) not null default 0,
  saldo_favor numeric(12,2) not null default 0,
  limite_credito numeric(12,2) not null default 0,
  condicion_pago text not null default 'Contado'
    check(condicion_pago in('Contado','Plazo 7','Plazo 15','Plazo 30','Plazo 45','Plazo 60')),
  dias_de_gracia integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.cuentas_corrientes enable row level security;

drop policy if exists cuentas_corrientes_all on public.cuentas_corrientes;
create policy cuentas_corrientes_all on public.cuentas_corrientes for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists cuentas_corrientes_tenant_idx on public.cuentas_corrientes(tenant_id, activo);
create index if not exists cuentas_corrientes_deuda_idx on public.cuentas_corrientes(saldo_deuda);

create table if not exists public.movimientos_cuentas_corrientes(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cuenta_corriente_id uuid not null references public.cuentas_corrientes(id) on delete cascade,
  tipo text not null check(tipo in('Cargo','Abono','Ajuste')),
  monto numeric(12,2) not null,
  saldo_anterior numeric(12,2) not null,
  saldo_nuevo numeric(12,2) not null,
  referencia_tipo text not null
    check(referencia_tipo in('Venta','Pago','Devolución','Ajuste','Nota de Crédito')),
  referencia_id uuid,
  descripcion text not null,
  fecha_vencimiento date,
  -- Nullable: movements written by the sales trigger inherit the sale's author,
  -- but a movement can also be produced by a database-level adjustment.
  creado_por uuid,
  creado_en timestamptz not null default now()
);

alter table public.movimientos_cuentas_corrientes enable row level security;

drop policy if exists movimientos_cc_all on public.movimientos_cuentas_corrientes;
create policy movimientos_cc_all on public.movimientos_cuentas_corrientes for all
  using(tenant_id = public.tenant_id())
  with check(tenant_id = public.tenant_id());

create index if not exists movimientos_cc_cuenta_idx on public.movimientos_cuentas_corrientes(cuenta_corriente_id);
create index if not exists movimientos_cc_cliente_idx on public.movimientos_cuentas_corrientes(cliente_id, creado_en desc);
create index if not exists movimientos_cc_vencimiento_idx on public.movimientos_cuentas_corrientes(fecha_vencimiento);

create or replace function public.actualizar_cuentas_corrientes_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists cuentas_corrientes_ts on public.cuentas_corrientes;
create trigger cuentas_corrientes_ts before update on public.cuentas_corrientes
  for each row execute function public.actualizar_cuentas_corrientes_timestamp();

-- ---------------------------------------------------------------------------
-- Replace the sales trigger from migration 011.
--
-- The original version opened a current account on every completed sale,
-- including cash ones, and dropped the sale's author. This version only touches
-- the current account when the sale is actually on credit.
-- ---------------------------------------------------------------------------
create or replace function public.procesar_venta_en_cuenta_corriente()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cuenta_id uuid;
  v_saldo_anterior numeric;
  v_nuevo_saldo numeric;
begin
  if new.estado <> 'Completada' or (old is not null and old.estado = 'Completada') then
    return new;
  end if;

  -- Cash, card and transfer settle immediately: no receivable to record.
  if new.metodo_pago <> 'Cuenta Corriente' then
    return new;
  end if;

  insert into public.cuentas_corrientes (tenant_id, cliente_id)
  values (new.tenant_id, new.cliente_id)
  on conflict (cliente_id) do nothing;

  select id, saldo_deuda into v_cuenta_id, v_saldo_anterior
  from public.cuentas_corrientes
  where cliente_id = new.cliente_id;

  if v_cuenta_id is null then
    return new;
  end if;

  v_nuevo_saldo := v_saldo_anterior + new.total;

  insert into public.movimientos_cuentas_corrientes (
    tenant_id, cliente_id, cuenta_corriente_id, tipo, monto,
    saldo_anterior, saldo_nuevo, referencia_tipo, referencia_id,
    descripcion, creado_por
  )
  values (
    new.tenant_id, new.cliente_id, v_cuenta_id, 'Cargo', new.total,
    v_saldo_anterior, v_nuevo_saldo, 'Venta', new.id,
    'Venta #' || new.id, new.creado_por
  );

  update public.cuentas_corrientes
  set saldo_deuda = v_nuevo_saldo
  where id = v_cuenta_id;

  return new;
end;
$$;

drop trigger if exists procesar_venta_trigger on public.ventas;
create trigger procesar_venta_trigger after insert or update on public.ventas
  for each row execute function public.procesar_venta_en_cuenta_corriente();


-- ================================================================
-- 1*.sql
-- ================================================================

