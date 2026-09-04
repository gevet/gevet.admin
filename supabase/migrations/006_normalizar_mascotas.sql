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
