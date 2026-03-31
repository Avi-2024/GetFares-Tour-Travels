# Development Guidelines

## Code Quality Standards

### File Organization
- **Backend**: Each module follows strict file naming: `<module>.<layer>.js` (e.g., `leads.service.js`, `leads.controller.js`)
- **Frontend**: TypeScript files use `.ts` or `.tsx` extensions, organized by feature
- **Index Files**: Every module/directory exports public API through `index.js` or `index.ts`
- **Barrel Exports**: Use named exports in index files for clean imports

### Naming Conventions
- **Files**: kebab-case for all files (`leads.service.js`, `auth-context.tsx`)
- **Functions**: camelCase for functions and methods (`createLeadsService`, `normalizeEmail`)
- **Classes**: PascalCase for classes (`InMemoryDatabase`, `PostgresDatabase`, `AgentCache`)
- **Constants**: SCREAMING_SNAKE_CASE for constants (`LEAD_TEMPERATURE`, `FOLLOWUP_COMPLIANCE_RULES`)
- **Private Functions**: Prefix with underscore or keep in closure scope
- **Database Columns**: snake_case (`full_name`, `assigned_to`, `created_at`)
- **API/Frontend**: camelCase for JSON properties (`fullName`, `assignedTo`, `createdAt`)

### Code Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Aim for 80-100 characters, max 120
- **Semicolons**: Required in backend JavaScript, optional in TypeScript (follow project convention)
- **Quotes**: Double quotes for strings in backend, single quotes acceptable in frontend
- **Trailing Commas**: Use in multi-line arrays and objects
- **Arrow Functions**: Prefer arrow functions for callbacks and short functions

### Documentation Standards
- **JSDoc Comments**: Use for public functions, especially in services and utilities
- **Inline Comments**: Explain complex business logic, not obvious code
- **TODO Comments**: Format as `// TODO: description` with context
- **Function Headers**: Document parameters, return types, and side effects for complex functions

## Architectural Patterns

### Backend Patterns

#### Module Factory Pattern
Every backend module exports a factory function that accepts dependencies:
```javascript
function createXModule({ dependencies }) {
  // Initialize repository, service, controller
  const repository = createXRepository({ db, logger });
  const service = createXService({ repository, logger, events });
  const controller = createXController({ service, logger });
  const router = createXRoutes({ controller, middleware });
  
  return Object.freeze({
    name: 'x',
    router,
    controller,
    service,
    repository,
    events,
  });
}
```

#### Dependency Injection
- **Container-Based**: Use `container.js` to wire all dependencies
- **Explicit Dependencies**: Pass dependencies as function parameters, never use globals
- **Immutable Exports**: Return frozen objects from factory functions

#### Service Layer Pattern
Services contain business logic and orchestration:
```javascript
function createLeadsService({ repository, logger, events }) {
  // Private helper functions
  function normalizeEmail(value) { /* ... */ }
  
  // Public API
  return Object.freeze({
    async create(payload, context) { /* ... */ },
    async getById(id, context) { /* ... */ },
    async update(id, payload, context) { /* ... */ },
  });
}
```

#### Repository Pattern
Repositories handle data access:
- **Database Abstraction**: Abstract database operations behind repository interface
- **Query Building**: Build SQL queries dynamically with parameterized queries
- **Normalization**: Convert between snake_case (DB) and camelCase (API)

#### Event-Driven Architecture
- **Event Emitters**: Use event bus for inter-module communication
- **Event Subscribers**: Register subscribers in module initialization
- **Event Naming**: Use dot notation (`leads.created`, `leads.updated`, `leads.followup_overdue`)

### Frontend Patterns

#### Service Layer
Frontend services wrap API calls and provide business logic:
```typescript
export const createLeadsService = (datasource: LeadsDatasource) => ({
  listLeads: async (params?: LeadsQuery): Promise<LeadListItem[]> => {
    const response = await datasource.list(params);
    return normalizeResponse(response);
  },
});
```

#### Data Source Pattern
Data sources handle HTTP communication:
- **API Client**: Centralized Axios instance with interceptors
- **Error Handling**: Consistent error transformation
- **Response Normalization**: Transform API responses to frontend types

#### Context Pattern
Use React Context for cross-cutting concerns:
- **AuthContext**: Authentication state and user info
- **ServiceContext**: Dependency injection for services
- **NotificationsContext**: Real-time notification management

#### Custom Hooks
Encapsulate reusable logic in custom hooks:
- **Service Hooks**: `useLeadsService`, `useAuthService`
- **State Hooks**: Manage component state with hooks
- **Effect Hooks**: Handle side effects consistently

## Common Implementation Patterns

### Error Handling

#### Backend Error Handling
```javascript
// Custom error class
class AppError extends Error {
  constructor(statusCode, message, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Usage in services
if (!item) {
  throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
}

// Centralized error middleware
function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    });
  }
  // Handle unexpected errors
}
```

#### Frontend Error Handling
```typescript
try {
  const result = await service.createLead(payload);
  return result;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message || error.message;
    throw new Error(message);
  }
  throw error;
}
```

### Validation Pattern

#### Backend Validation (Zod)
```javascript
import { z } from "zod";

const createLeadSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20),
  destinationId: z.string().uuid().optional(),
  travelDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
});

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: error.errors });
    }
  };
}
```

### Normalization Pattern

#### Data Normalization
```javascript
// Backend: DB to API
function toApiRecord(dbRow) {
  return {
    id: dbRow.id,
    fullName: dbRow.full_name,
    assignedTo: dbRow.assigned_to,
    createdAt: dbRow.created_at,
  };
}

// Backend: API to DB
function toDbRecord(apiPayload) {
  return {
    full_name: apiPayload.fullName,
    assigned_to: apiPayload.assignedTo,
  };
}

// Frontend: Normalize status
function normalizeStatusToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
```

### Caching Pattern

#### In-Memory Caching
```javascript
class AgentCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidate(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

### Pagination Pattern

#### Backend Pagination
```javascript
async function list(filters = {}) {
  const page = toPositiveInt(filters.page, 1);
  const limit = toPositiveInt(filters.limit, 15, 500);
  const offset = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    repository.findMany({ ...filters, limit, offset }),
    repository.count(filters),
  ]);
  
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Async Handler Pattern

#### Backend Async Wrapper
```javascript
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.get('/leads', asyncHandler(async (req, res) => {
  const leads = await service.list(req.query, req.context);
  res.json({ data: leads });
}));
```

## Database Patterns

### Query Building
```javascript
// Parameterized queries
async function findMany(tableName, filters = {}) {
  const table = quoteIdentifier(tableName);
  const normalizedFilters = normalizeFilters(filters);
  const values = [];

  const whereClause = normalizedFilters
    .map(([key, value], index) => {
      values.push(value);
      return `${quoteIdentifier(key)} = $${index + 1}`;
    })
    .join(" AND ");

  let query = `SELECT * FROM ${table}`;
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }

  const result = await pool.query(query, values);
  return result.rows;
}
```

### Transaction Pattern
```javascript
async function createWithTransaction(payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const lead = await client.query(
      'INSERT INTO leads (...) VALUES (...) RETURNING *',
      [...]
    );
    
    await client.query(
      'INSERT INTO activities (...) VALUES (...)',
      [...]
    );
    
    await client.query('COMMIT');
    return lead.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Connection Pooling
```javascript
const poolConfig = {
  connectionString: config.database.url,
  max: isServerless ? 2 : 10,
  idleTimeoutMillis: isServerless ? 20000 : 30000,
  connectionTimeoutMillis: isServerless ? 7000 : 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 60000,
  query_timeout: 60000,
};

const pool = new Pool(poolConfig);
pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});
```

## Security Patterns

### Authentication
```javascript
// JWT token generation
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// JWT verification middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Authorization (RBAC)
```javascript
// Permission check
function requirePermission(resource, action) {
  return async (req, res, next) => {
    const hasPermission = await rbacService.checkPermission(
      req.user.role,
      resource,
      action
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage
router.post('/leads', 
  authenticate,
  requirePermission('leads', 'create'),
  asyncHandler(controller.create)
);
```

### Input Sanitization
```javascript
// Email normalization
function normalizeEmail(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

// HTML escaping
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// SQL identifier quoting
function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}
```

## Testing Patterns

### Unit Testing
```javascript
// Service test
describe('LeadsService', () => {
  it('should create a lead with normalized data', async () => {
    const mockRepository = {
      create: jest.fn().mockResolvedValue({ id: '123' }),
    };
    
    const service = createLeadsService({
      repository: mockRepository,
      logger: mockLogger,
      events: mockEvents,
    });
    
    const result = await service.create({
      fullName: 'John Doe',
      email: 'JOHN@EXAMPLE.COM',
    });
    
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'John Doe',
        email: 'john@example.com',
      })
    );
  });
});
```

## Performance Patterns

### Batch Processing
```javascript
async function processBatch(items, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### Debouncing
```javascript
function debounce(fn, delayMs) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
```

## Logging Patterns

### Structured Logging
```javascript
// Pino logger usage
logger.info(
  { 
    module: 'leads', 
    requestId: context.requestId, 
    userId: context.user?.id 
  },
  'Creating new lead'
);

logger.error(
  { 
    err: error, 
    leadId: id, 
    operation: 'update' 
  },
  'Failed to update lead'
);

// Request logging
app.use(pinoHttp({ logger }));
```

## Configuration Patterns

### Environment Variables
```javascript
// Backend config
const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

// Frontend config
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
};
```

## Best Practices Summary

### DO
- ✅ Use factory functions for module creation
- ✅ Inject dependencies explicitly
- ✅ Return frozen objects from factories
- ✅ Use parameterized queries for SQL
- ✅ Normalize data at boundaries (API/DB)
- ✅ Handle errors with custom error classes
- ✅ Log with structured context
- ✅ Validate all inputs with Zod
- ✅ Use async/await for promises
- ✅ Cache frequently accessed data
- ✅ Use event-driven architecture for decoupling
- ✅ Follow consistent naming conventions

### DON'T
- ❌ Use global variables or singletons
- ❌ Mix business logic in controllers
- ❌ Expose internal implementation details
- ❌ Use string concatenation for SQL queries
- ❌ Ignore error handling
- ❌ Log sensitive information
- ❌ Use synchronous operations in async code
- ❌ Mutate function parameters
- ❌ Create circular dependencies
- ❌ Skip input validation
- ❌ Use magic numbers or strings
- ❌ Commit credentials or secrets
