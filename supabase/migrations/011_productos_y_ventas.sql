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
