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
