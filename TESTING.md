# Testing Guide - GeVet SaaS

Complete guide to testing the GeVet platform.

## Quick Start

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Debug failing test
npm run test:debug -- --testNamePattern="test name"
```

## Test Structure

Tests are organized in `src/__tests__/` parallel to source code:

```
src/
├── app/
│   └── admin/
│       └── clientes/
│           ├── page.tsx
│           └── __tests__/
│               └── page.test.tsx
├── components/
│   └── admin/
│       └── clientes/
│           ├── cliente-form.tsx
│           └── __tests__/
│               └── cliente-form.test.tsx
├── lib/
│   ├── types/
│   └── __tests__/
│       ├── validation.test.ts
│       └── rls-security.test.ts
└── __tests__/
    ├── server-actions/
    │   └── validation.test.ts
    ├── components/
    │   └── cliente-detail-view.test.tsx
    └── lib/
        └── rls-security.test.ts
```

## Test Categories

### 1. Unit Tests (Validation & Logic)

**File**: `src/__tests__/server-actions/validation.test.ts`

Tests Zod schemas and business logic validation:

```bash
npm test -- validation.test.ts
```

- ✅ ClienteSchema accepts valid data
- ✅ ClienteSchema rejects invalid documento
- ✅ MascotaSchema validates UUIDs
- ✅ MascotaSchema enforces positive weights

**Coverage**: Input validation, error messages, edge cases

### 2. Component Tests (UI Logic)

**File**: `src/__tests__/components/cliente-detail-view.test.tsx`

Tests React component rendering and interactions:

```bash
npm test -- cliente-detail-view.test.tsx
```

- ✅ Renders cliente information correctly
- ✅ Toggles between view/edit modes
- ✅ Handles missing fields gracefully

**Tools**: @testing-library/react, user-event

**Patterns**:
```typescript
import { render, screen } from '@testing-library/react'

it('should render cliente name', () => {
  render(<Cliente cliente={mockData} />)
  expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
})
```

### 3. Integration Tests (APIs & Database)

**Note**: Integration tests require live Supabase connection and are run separately.

Run against staging environment:

```bash
SUPABASE_URL=... SUPABASE_KEY=... npm run test:integration
```

### 4. Security Tests (RLS & Auth)

**File**: `src/__tests__/lib/rls-security.test.ts`

Documents RLS security requirements and test scenarios:

```bash
npm test -- rls-security.test.ts
```

**Critical Tests**:
- ✅ Cross-tenant data isolation (Tenant A can't read Tenant B)
- ✅ Write/delete protection
- ✅ Cascading query safety
- ✅ JWT validation

**Run Full RLS Suite** (requires Supabase):

```bash
npm run test:rls
```

See [RLS_TESTING_GUIDE.md](./RLS_TESTING_GUIDE.md) for detailed instructions.

## Coverage Requirements

Minimum coverage thresholds (defined in `jest.config.ts`):

```typescript
coverageThreshold: {
  global: {
    branches: 50,    // 50% of conditional branches
    functions: 50,   // 50% of functions called
    lines: 50,       // 50% of lines executed
    statements: 50,  // 50% of statements executed
  },
}
```

Check coverage:

```bash
npm run test:coverage
```

Coverage report in: `coverage/index.html`

## Test Writing Guide

### Naming Conventions

```typescript
// ✅ Good: Describes what is tested
it('should reject cliente with invalid email', () => {})
it('should render mascota list sorted by name', () => {})
it('should throw error if cliente_id missing', () => {})

// ❌ Bad: Vague or technical
it('tests validation', () => {})
it('check component', () => {})
```

### Test Structure (Arrange-Act-Assert)

```typescript
it('should update cliente information', () => {
  // ARRANGE: Setup test data
  const mockCliente = { nombre: 'Juan', ... }
  const mockUpdate = jest.fn()

  // ACT: Perform action
  render(<ClienteForm cliente={mockCliente} onUpdate={mockUpdate} />)
  const input = screen.getByLabelText('Nombre')
  fireEvent.change(input, { target: { value: 'Carlos' } })
  fireEvent.click(screen.getByText('Guardar'))

  // ASSERT: Verify result
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ nombre: 'Carlos' })
  )
})
```

### Mocking Dependencies

```typescript
// Mock server actions
jest.mock('@/app/admin/actions/clientes', () => ({
  crearClienteAction: jest.fn().mockResolvedValue({
    success: true,
    data: mockCliente,
  }),
}))

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: mockData }),
  }),
}

// Mock Next.js navigation (already in jest.setup.ts)
jest.mock('next/navigation')
```

### Testing Async Operations

```typescript
it('should load cliente data', async () => {
  render(<ClientePage clienteId="123" />)

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText('Cargando')).not.toBeInTheDocument()
  })

  // Verify data is displayed
  expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
})
```

### Testing Error States

```typescript
it('should display error message on failure', async () => {
  jest.mock('@/actions/clientes', () => ({
    crearClienteAction: jest.fn().mockRejectedValue(
      new Error('Validation error')
    ),
  }))

  render(<ClienteForm />)
  fireEvent.click(screen.getByText('Guardar'))

  const error = await screen.findByText(/Validation error/)
  expect(error).toBeInTheDocument()
})
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --testNamePattern="should reject invalid email"
```

### Debug Mode (Chrome DevTools)

```bash
npm run test:debug

# Open: chrome://inspect
# Click "inspect" on the running process
```

### Verbose Output

```bash
npm test -- --verbose
```

### Watch Specific File

```bash
npm run test:watch -- src/components/__tests__/cliente-form.test.tsx
```

## Performance Testing

### Coverage Report Size

```bash
# Check test execution time
npm test -- --detectOpenHandles

# Identify slow tests
npm test -- --detectLeaks
```

### Measure Component Performance

```typescript
it('should render large cliente list efficiently', () => {
  const mockClientes = Array(1000).fill(mockCliente)
  
  const { rerender } = render(
    <ClienteList clientes={mockClientes} />
  )

  // Re-render should be fast
  expect(() => {
    rerender(<ClienteList clientes={mockClientes} />)
  }).not.toThrow()
})
```

## CI/CD Integration

### GitHub Actions

Tests run on every push:

```yaml
- name: Run tests
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hook (future)

```bash
# Install husky
npm install husky --save-dev
npx husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
npm test -- --bail --findRelatedTests
EOF
```

## Test Data & Fixtures

### Use Factory Functions

```typescript
// factory.ts
export function createMockCliente(overrides?: Partial<Cliente>) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nombre: 'Juan',
    apellido: 'Pérez',
    numero_documento: '12345678',
    ...overrides,
  }
}

// test.ts
const cliente = createMockCliente({ nombre: 'Carlos' })
```

### Seed Test Database

For integration tests, seed data once:

```typescript
beforeAll(async () => {
  await seedTestData({
    tenants: 2,
    clientesPerTenant: 100,
    mascotasPerCliente: 5,
  })
})

afterAll(async () => {
  await cleanupTestData()
})
```

## Known Issues & Workarounds

### Next.js Navigation

`next/navigation` is mocked in `jest.setup.ts`. If needed:

```typescript
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    // Add more methods as needed
  }),
}))
```

### Async Component Rendering

If component has `use client` and async data loading:

```typescript
// Wrap in act()
await act(async () => {
  render(<AsyncComponent />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [RLS Security Testing](./RLS_TESTING_GUIDE.md)

## Checklist: Before Committing

- [ ] All tests pass: `npm test`
- [ ] No coverage decrease: `npm run test:coverage`
- [ ] No linting errors: `npm run lint`
- [ ] Types check: `npm run check`
- [ ] Component renders: `npm run dev`

---

**Next Step**: Write tests for critical features as part of Phase 5.
