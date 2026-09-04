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
