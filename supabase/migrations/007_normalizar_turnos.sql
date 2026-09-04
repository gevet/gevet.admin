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
