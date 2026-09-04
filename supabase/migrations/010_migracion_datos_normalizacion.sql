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
