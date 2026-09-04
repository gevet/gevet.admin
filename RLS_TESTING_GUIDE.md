# RLS Security Testing Guide

## Overview

This guide explains how to validate Row-Level Security (RLS) in the GeVet multi-tenant architecture. RLS is critical for ensuring data isolation between tenants.

## Quick Start: Unit Tests

Run unit tests for Zod validation and component rendering:

```bash
npm test                  # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

## Integration Tests: RLS Validation

### Prerequisites

1. Access to a Supabase development project with test data
2. Two test tenant accounts
3. Test data seeded in database

### Setup Test Tenants

```bash
# You need actual Supabase project credentials
# Set environment variables:
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=eyJhbGc...
export TEST_TENANT_A_ID=550e8400-e29b-41d4-a716-446655440001
export TEST_TENANT_B_ID=550e8400-e29b-41d4-a716-446655440002
```

### Seed Test Data

```typescript
// 1. Create two test tenants
const tenantA = await supabase
  .from('Tenant')
  .insert({
    nombre: 'Test Clinic A',
    identificacion_fiscal: '12345678',
    activo: true,
  })
  .select()
  .single()

const tenantB = await supabase
  .from('Tenant')
  .insert({
    nombre: 'Test Clinic B',
    identificacion_fiscal: '87654321',
    activo: true,
  })
  .select()
  .single()

// 2. Create test users
const userA = await supabase.auth.signUpWithPassword({
  email: 'test-tenant-a@gevet.test',
  password: 'test-password-123',
})

const userB = await supabase.auth.signUpWithPassword({
  email: 'test-tenant-b@gevet.test',
  password: 'test-password-123',
})

// 3. Add users to GestionUsuario table
// 4. Create test clientes/mascotas for each tenant
// 5. Create Supabase custom claims mapping tenant_id to JWT
```

### Run RLS Integration Tests

```bash
# Run RLS tests against real database
npm run test:rls

# Run with detailed output
npm run test:rls -- --verbose

# Debug specific test
npm run test:debug -- --testNamePattern="should prevent Tenant A from reading Tenant B data"
```

## Test Scenarios

### 1. Cross-Tenant Read Isolation

**Test**: Tenant A should NOT see Tenant B's data

```typescript
// Authenticate as Tenant A
const sessionA = await getSession(userA.session.access_token)

// Query clientes
const clientesA = await listarClientesAction()

// Verify: only Tenant A's clientes returned
expect(clientesA.data).toEqual(
  clientesA.data.filter(c => c.tenant_id === TEST_TENANT_A_ID)
)

// Verify: ZERO Tenant B clientes
expect(clientesA.data).not.toEqual(
  expect.arrayContaining([
    expect.objectContaining({ tenant_id: TEST_TENANT_B_ID })
  ])
)
```

**RLS Policy Verified**:
```sql
-- Should block this:
SELECT * FROM Cliente WHERE tenant_id = 'TEST_TENANT_B_ID'
-- Even if authenticated as Tenant A
```

### 2. Cross-Tenant Write Prevention

**Test**: Tenant A should NOT modify Tenant B's data

```typescript
// Get a Tenant B cliente
const tenantBCliente = clientes.find(c => c.tenant_id === TEST_TENANT_B_ID)

// Try to update it as Tenant A user
const updateResult = await actualizarClienteAction({
  id: tenantBCliente.id,
  nombre: 'HACKED',
})

// Should fail
expect(updateResult.error).toBeDefined()
expect(updateResult.error).toContain('permission')
```

**RLS Policy Verified**:
```sql
-- UPDATE policy prevents this
UPDATE Cliente
SET nombre = 'HACKED'
WHERE id = 'TENANT_B_CLIENT_ID'
-- Returns: 0 rows updated (silently fails due to RLS)
```

### 3. Cascading Query Isolation

**Test**: Loading mascotas for cliente should respect tenant_id

```typescript
// Create mascota under Tenant A cliente
const mascotaA = await crearMascotaAction({
  cliente_id: tenantACliente.id,
  nombre: 'Fido',
  especie: 'Perro',
})

// Create mascota under Tenant B cliente
const mascotaB = await crearMascotaAction({
  cliente_id: tenantBCliente.id,
  nombre: 'Whiskers',
  especie: 'Gato',
})

// Load all mascotas as Tenant A
const mascotasA = await listarMascotasAction()

// Should only see Tenant A's mascota
expect(mascotasA.data).toContainEqual(
  expect.objectContaining({
    id: mascotaA.id,
    nombre: 'Fido',
  })
)

expect(mascotasA.data).not.toContainEqual(
  expect.objectContaining({
    id: mascotaB.id,
    nombre: 'Whiskers',
  })
)
```

### 4. Soft-Delete Protection

**Test**: Deleted (soft) records still protected by RLS

```typescript
// Soft-delete a Tenant A cliente
const deleteResult = await eliminarClienteAction(clienteA.id)
expect(deleteResult.success).toBe(true)

// Try to access it as Tenant B
const resultB = await obtenerClienteAction(clienteA.id)
expect(resultB.error).toBeDefined() // Should not find it

// Verify it still exists in DB (soft-deleted)
const raw = await supabase
  .from('Cliente')
  .select('*')
  .eq('id', clienteA.id)
  .single()
  .throwOnError()

expect(raw.activo).toBe(false) // Soft-deleted
```

## Automated RLS Validation Script

Create `scripts/validate-rls.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

async function validateRLS() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

  // Test 1: Cross-tenant isolation
  const testResults = {
    crossTenantReadBlocked: false,
    crossTenantWriteBlocked: false,
    cascadingQueriesSafe: false,
  }

  try {
    // Implementation
  } catch (e) {
    console.error('RLS Validation Failed:', e)
    process.exit(1)
  }

  console.log('RLS Validation Passed:', testResults)
}

validateRLS()
```

Run in CI/CD:
```bash
npm run validate:rls
```

## Continuous Monitoring

### Metrics to Track

1. **RLS Bypass Attempts** (Sentry/logs)
   - Any query that tries to access cross-tenant data
   - Monitor error rates

2. **Access Logs** (PostgreSQL audit)
   - Who accessed what data when
   - Query performance (N+1 detection)

3. **Permission Denials** (Database metrics)
   - RLS policy rejections
   - Should be zero in production

### Set Up Alerts

```sql
-- Alert if anyone successfully queries across tenant boundaries
CREATE ALERT IF rls_bypass_detected AS
SELECT COUNT(*) FROM audit_log
WHERE cross_tenant_access = true
AND timestamp > now() - INTERVAL '1 hour'
HAVING COUNT(*) > 0
```

## Checklist Before Production

- [ ] All unit tests passing (npm test)
- [ ] RLS integration tests passing against staging
- [ ] Cross-tenant read/write/delete blocking verified
- [ ] Soft-delete protection verified
- [ ] Cascading queries validated (no N+1 leaks)
- [ ] Audit logging enabled and tested
- [ ] Error messages do not leak data
- [ ] JWT validation on every request
- [ ] Rate limiting enabled
- [ ] Sentry/monitoring connected

## Troubleshooting

### "Permission denied" on every query
- Check JWT has tenant_id claim
- Verify RLS policy correctly references auth.jwt()
- Test policy with: `SELECT current_setting('request.jwt.claims')`

### Data visible across tenants
- Check RLS policy WHERE clause
- Verify tenant_id filter is applied
- Run: `EXPLAIN (ANALYZE) SELECT ...` to see query plan

### Cascading queries returning wrong data
- Add tenant_id filter to every JOIN
- Never rely on implicit filtering
- Add test data with IDs from multiple tenants

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgeSQL Custom Claims](https://supabase.com/docs/guides/auth/auth-helpers/nextjs#server-side-rendering-ssr)
- [Security Testing Best Practices](https://owasp.org/www-project-testing-guide/)
