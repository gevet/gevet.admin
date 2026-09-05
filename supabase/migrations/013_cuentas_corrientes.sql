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
