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
