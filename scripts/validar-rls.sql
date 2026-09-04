-- Validation script for Row Level Security (RLS) policies
-- This script checks that all production tables have RLS enabled and proper isolation
-- Run against Supabase database to verify security posture

-- Colors for output
-- \set OK '\033[92m'
-- \set FAIL '\033[91m'
-- \set RESET '\033[0m'

begin;

-- Track results
create temporary table validation_results(
  check_name text,
  status text,
  details text
);

-- Check 1: All production tables have RLS enabled
do $$
declare
  v_tables text[] := array['tenants', 'gestion_usuarios', 'tenant_branding', 'gestion_registros', 'clientes', 'mascotas', 'turnos', 'consultas', 'roles', 'sucursales', 'gestion_usuarios_roles'];
  v_table text;
  v_rls_enabled boolean;
begin
  foreach v_table in array v_tables loop
    select rowsecurity into v_rls_enabled
    from pg_class
    where relnamespace = 'public'::regnamespace
    and relname = v_table;

    if v_rls_enabled is null then
      insert into validation_results values(
        'RLS_ENABLED_' || v_table,
        'WARNING',
        'Table ' || v_table || ' does not exist'
      );
    elsif v_rls_enabled = false then
      insert into validation_results values(
        'RLS_ENABLED_' || v_table,
        'FAIL',
        'Table ' || v_table || ' does not have RLS enabled'
      );
    else
      insert into validation_results values(
        'RLS_ENABLED_' || v_table,
        'PASS',
        'RLS enabled'
      );
    end if;
  end loop;
end$$;

-- Check 2: Multi-tenant tables have tenant_id isolation policy
do $$
declare
  v_tables text[] := array['clientes', 'mascotas', 'turnos', 'consultas', 'roles', 'sucursales', 'gestion_usuarios_roles'];
  v_table text;
  v_policy_exists boolean;
begin
  foreach v_table in array v_tables loop
    select exists(
      select 1 from pg_policies
      where tablename = v_table
      and (policyname like '%aislamiento%' or policyname like '%select%' or policyname like '%insert%')
    ) into v_policy_exists;

    if v_policy_exists then
      insert into validation_results values(
        'TENANT_ISOLATION_' || v_table,
        'PASS',
        'Isolation policy exists'
      );
    else
      insert into validation_results values(
        'TENANT_ISOLATION_' || v_table,
        'FAIL',
        'No tenant isolation policy found'
      );
    end if;
  end loop;
end$$;

-- Check 3: Foreign key constraints prevent cross-tenant data leaks
do $$
declare
  v_fk_tables text[] := array[
    'mascotas',  -- must have FK to clientes
    'turnos',    -- must have FK to clientes and mascotas
    'consultas'  -- must have FK to turnos, mascotas, clientes
  ];
  v_table text;
  v_fk_count integer;
begin
  foreach v_table in array v_fk_tables loop
    select count(*) into v_fk_count
    from information_schema.table_constraints
    where table_schema = 'public'
    and table_name = v_table
    and constraint_type = 'FOREIGN KEY';

    if v_fk_count > 0 then
      insert into validation_results values(
        'FOREIGN_KEYS_' || v_table,
        'PASS',
        'Found ' || v_fk_count || ' foreign key constraint(s)'
      );
    else
      insert into validation_results values(
        'FOREIGN_KEYS_' || v_table,
        'FAIL',
        'No foreign key constraints found'
      );
    end if;
  end loop;
end$$;

-- Check 4: Verify tenant_id() function exists and is stable
do $$
declare
  v_func_exists boolean;
  v_func_stable boolean;
begin
  select exists(
    select 1 from pg_proc
    where proname = 'tenant_id'
    and pronamespace = 'public'::regnamespace
  ) into v_func_exists;

  if v_func_exists then
    select prostable into v_func_stable
    from pg_proc
    where proname = 'tenant_id'
    and pronamespace = 'public'::regnamespace;

    if v_func_stable then
      insert into validation_results values(
        'TENANT_FUNCTION',
        'PASS',
        'tenant_id() exists and is STABLE'
      );
    else
      insert into validation_results values(
        'TENANT_FUNCTION',
        'WARNING',
        'tenant_id() exists but is not STABLE'
      );
    end if;
  else
    insert into validation_results values(
      'TENANT_FUNCTION',
      'FAIL',
      'tenant_id() function not found'
    );
  end if;
end$$;

-- Check 5: Verify tiene_permiso() function exists
do $$
declare
  v_func_exists boolean;
begin
  select exists(
    select 1 from pg_proc
    where proname = 'tiene_permiso'
    and pronamespace = 'public'::regnamespace
  ) into v_func_exists;

  if v_func_exists then
    insert into validation_results values(
      'PERMISSION_FUNCTION',
      'PASS',
      'tiene_permiso() exists'
    );
  else
    insert into validation_results values(
      'PERMISSION_FUNCTION',
      'FAIL',
      'tiene_permiso() function not found'
    );
  end if;
end$$;

-- Report results
select '=== RLS Validation Report ===' as report;
select '';

-- Summary counts
with summary as (
  select
    status,
    count(*) as count
  from validation_results
  group by status
)
select 'Summary: ' || string_agg(status || '=' || count, ', ' order by status) as summary
from summary;

select '';
select '=== Detailed Results ===' as section;

-- Detailed failures first
select '❌ FAILURES:' as section where exists(select 1 from validation_results where status = 'FAIL');
select '  ' || check_name || ': ' || details
from validation_results
where status = 'FAIL'
order by check_name;

-- Warnings
select '' where exists(select 1 from validation_results where status = 'WARNING');
select '⚠️  WARNINGS:' as section where exists(select 1 from validation_results where status = 'WARNING');
select '  ' || check_name || ': ' || details
from validation_results
where status = 'WARNING'
order by check_name;

-- Passes
select '' where exists(select 1 from validation_results where status = 'PASS');
select '✅ PASSED:' as section where exists(select 1 from validation_results where status = 'PASS');
select count(*) || ' checks passed' as passed_count
from validation_results
where status = 'PASS';

-- Exit with error if any failures
do $$
begin
  if exists(select 1 from validation_results where status = 'FAIL') then
    raise exception 'RLS validation failed: there are failing checks';
  end if;
end$$;

rollback;
