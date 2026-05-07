# CMS Backend - OOP & SOLID Principles Implementation

## Architecture Overview

This CMS backend is built using **pure Object-Oriented Programming** and follows **SOLID principles** for maintainability, scalability, and testability.

---

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
Each class has one reason to change:

- **Entity Classes**: Represent domain objects only
- **Repository Classes**: Handle data access only
- **Service Classes**: Contain business logic only
- **Controller Classes**: Handle HTTP requests only
- **Router Classes**: Configure routes only
- **Utility Classes**: Perform specific utility functions only

### 2. Open/Closed Principle (OCP)
Classes are open for extension, closed for modification:

- **Base Classes**: `BaseRepository`, `BaseService`, `BaseController`
- **Inheritance**: Modules extend base classes without modifying them
- **Error Classes**: Custom errors extend `AppError` base class

### 3. Liskov Substitution Principle (LSP)
Derived classes can substitute base classes:

- All repositories can be used wherever `IRepository` is expected
- All services can be used wherever `IService` is expected
- All controllers can be used wherever `IController` is expected

### 4. Interface Segregation Principle (ISP)
Interfaces are specific and focused:

- `IRepository`: Data access operations
- `IService`: Business logic operations
- `IController`: HTTP handling operations
- `IDatabase`: Database operations
- `ILogger`: Logging operations

### 5. Dependency Inversion Principle (DIP)
High-level modules depend on abstractions:

- Controllers depend on `IService` (not concrete service)
- Services depend on `IRepository` (not concrete repository)
- All dependencies injected through constructors

---

## Class Structure

### Core Layer

```
cms/core/
├── interfaces/
│   └── IBase.js              # Base interfaces (ISP)
├── base/
│   └── BaseClasses.js        # Abstract base classes (OCP)
├── errors/
│   └── Errors.js             # Error hierarchy (OCP, LSP)
├── utils/
│   └── Utilities.js          # Utility classes (SRP)
└── config/
    └── Configuration.js      # Singleton configuration
```

### Module Layer (Example: Landing Places)

```
cms/modules/landing/
├── LandingPlace.entity.js        # Domain entity
├── LandingPlaces.repository.js   # Data access (extends BaseRepository)
├── LandingPlaces.service.js      # Business logic (extends BaseService)
├── LandingPlaces.controller.js   # HTTP handling (extends BaseController)
├── LandingPlaces.routes.js       # Route configuration
└── LandingPlaces.module.js       # Module factory (DI)
```

---

## Class Diagrams

### Base Class Hierarchy

```
IRepository (Interface)
    ↑
BaseRepository (Abstract)
    ↑
LandingPlacesRepository (Concrete)

IService (Interface)
    ↑
BaseService (Abstract)
    ↑
LandingPlacesService (Concrete)

IController (Interface)
    ↑
BaseController (Abstract)
    ↑
LandingPlacesController (Concrete)
```

### Dependency Flow

```
CmsApplication
    ↓ creates
LandingPlacesModule
    ↓ injects database
LandingPlacesRepository
    ↓ injects repository
LandingPlacesService
    ↓ injects service
LandingPlacesController
    ↓ injects controller
LandingPlacesRouter
```

---

## Key Classes

### 1. Entity Classes

**Purpose**: Represent domain objects

```javascript
class LandingPlace {
  constructor(data) { }
  static fromDatabase(row) { }
  toDatabase() { }
  toJSON() { }
  validate() { }
}
```

**Responsibilities**:
- Data transformation (DB ↔ API)
- Self-validation
- Business rules enforcement

### 2. Repository Classes

**Purpose**: Data access layer

```javascript
class LandingPlacesRepository extends BaseRepository {
  constructor(database) {
    super(database, schema);
  }
  
  async findActive() { }
  async updateOrder(items) { }
  async countActive() { }
}
```

**Responsibilities**:
- CRUD operations
- Database queries
- Data persistence

### 3. Service Classes

**Purpose**: Business logic layer

```javascript
class LandingPlacesService extends BaseService {
  constructor(repository, logger) {
    super(repository, logger);
  }
  
  toEntity(row) { }
  async create(data) { }
  async reorder(items) { }
}
```

**Responsibilities**:
- Business rules
- Validation
- Entity transformation
- Orchestration

### 4. Controller Classes

**Purpose**: HTTP request handling

```javascript
class LandingPlacesController extends BaseController {
  constructor(service) {
    super(service);
  }
  
  list(req, res, next) { }
  create(req, res, next) { }
  reorder(req, res, next) { }
}
```

**Responsibilities**:
- Request parsing
- Response formatting
- Error handling delegation

### 5. Router Classes

**Purpose**: Route configuration

```javascript
class LandingPlacesRouter {
  constructor(controller) {
    this._controller = controller;
    this._router = express.Router();
    this._setupRoutes();
  }
  
  _setupRoutes() { }
  get router() { }
}
```

**Responsibilities**:
- Route definitions
- Middleware binding
- Controller method binding

### 6. Module Classes

**Purpose**: Dependency injection and composition

```javascript
class LandingPlacesModule {
  constructor(database, logger) {
    this._repository = new LandingPlacesRepository(database);
    this._service = new LandingPlacesService(this._repository, logger);
    this._controller = new LandingPlacesController(this._service);
    this._router = new LandingPlacesRouter(this._controller);
  }
  
  static create(database, logger) { }
}
```

**Responsibilities**:
- Create instances
- Inject dependencies
- Expose public API

---

## Utility Classes

### SlugGenerator
```javascript
class SlugGenerator {
  static generate(text) { }
  static isValid(slug) { }
}
```

### TextNormalizer
```javascript
class TextNormalizer {
  static normalize(value) { }
  static normalizeArray(values) { }
}
```

### DateFormatter
```javascript
class DateFormatter {
  static toDateOnly(value) { }
  static toISO(value) { }
  static now() { }
}
```

### NumberConverter
```javascript
class NumberConverter {
  static toNumber(value, fallback) { }
  static toInteger(value, fallback) { }
  static toPositive(value, fallback) { }
}
```

### Validator
```javascript
class Validator {
  static isRequired(value, fieldName) { }
  static isEmail(value) { }
  static isUrl(value) { }
  static isInRange(value, min, max) { }
}
```

---

## Error Hierarchy

```
Error (Built-in)
    ↑
AppError (Base)
    ↑
    ├── NotFoundError
    ├── ValidationError
    ├── DuplicateError
    ├── UnauthorizedError
    ├── ForbiddenError
    └── ConflictError
```

**Usage**:
```javascript
throw new NotFoundError('Landing Place');
throw new ValidationError('Name is required', 'name');
throw new ConflictError('Maximum 4 landing places allowed');
```

---

## Configuration Management

**Singleton Pattern**:
```javascript
const config = Configuration.getInstance();

console.log(config.port);
console.log(config.database.url);
console.log(config.isDevelopment);
```

---

## Application Lifecycle

```javascript
// Create application
const app = CmsApplication.create();

// Initialize (setup database, modules, routes)
await app.initialize();

// Start server
await app.start();

// Graceful shutdown
await app.shutdown();
```

---

## Usage Examples

### 1. Create a New Module

```javascript
// 1. Create Entity
class Destination {
  constructor(data) { }
  static fromDatabase(row) { }
  toDatabase() { }
  validate() { }
}

// 2. Create Repository
class DestinationsRepository extends BaseRepository {
  constructor(database) {
    super(database, { tableName: 'destinations' });
  }
}

// 3. Create Service
class DestinationsService extends BaseService {
  constructor(repository, logger) {
    super(repository, logger);
  }
  
  toEntity(row) {
    return Destination.fromDatabase(row);
  }
}

// 4. Create Controller
class DestinationsController extends BaseController {
  constructor(service) {
    super(service);
  }
}

// 5. Create Router
class DestinationsRouter {
  constructor(controller) {
    this._controller = controller;
    this._router = express.Router();
    this._setupRoutes();
  }
}

// 6. Create Module
class DestinationsModule {
  constructor(database, logger) {
    this._repository = new DestinationsRepository(database);
    this._service = new DestinationsService(this._repository, logger);
    this._controller = new DestinationsController(this._service);
    this._router = new DestinationsRouter(this._controller);
  }
  
  static create(database, logger) {
    return new DestinationsModule(database, logger);
  }
}
```

### 2. Add Module to Application

```javascript
// In CmsApplication._setupModules()
_setupModules() {
  this._modules.landing = LandingPlacesModule.create(
    this._database,
    this._logger
  );
  
  this._modules.destinations = DestinationsModule.create(
    this._database,
    this._logger
  );
}

// In CmsApplication._setupRoutes()
_setupRoutes() {
  this._app.use('/api/cms/landing-places', this._modules.landing.routes);
  this._app.use('/api/cms/destinations', this._modules.destinations.routes);
}
```

---

## Testing

### Unit Testing

```javascript
describe('LandingPlacesService', () => {
  let service;
  let mockRepository;
  
  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
    };
    service = new LandingPlacesService(mockRepository);
  });
  
  it('should create landing place', async () => {
    mockRepository.create.mockResolvedValue({ id: '1', name: 'Test' });
    
    const result = await service.create({ name: 'Test' });
    
    expect(result).toBeDefined();
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
describe('Landing Places API', () => {
  let app;
  
  beforeAll(async () => {
    app = CmsApplication.create();
    await app.initialize();
  });
  
  it('should list landing places', async () => {
    const response = await request(app.app)
      .get('/api/cms/landing-places')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

---

## Benefits of This Architecture

### 1. Maintainability
- Clear separation of concerns
- Easy to locate and fix bugs
- Consistent patterns across modules

### 2. Testability
- Easy to mock dependencies
- Unit test each layer independently
- Integration tests are straightforward

### 3. Scalability
- Add new modules without modifying existing code
- Extend base classes for new functionality
- Reuse utility classes across modules

### 4. Readability
- Self-documenting code structure
- Clear class responsibilities
- Consistent naming conventions

### 5. Flexibility
- Easy to swap implementations
- Support multiple databases
- Add new features without breaking existing code

---

## Running the Application

```bash
# Development
node backend/cms/index.js

# With environment variables
NODE_ENV=production DATABASE_URL=postgresql://... node backend/cms/index.js
```

---

## Next Steps

1. Implement remaining modules (Destinations, Packages, Visa)
2. Add authentication middleware
3. Add caching layer
4. Add request validation
5. Add API documentation
6. Add comprehensive tests

---

## Summary

This OOP implementation provides:
- ✅ Pure Object-Oriented design
- ✅ SOLID principles throughout
- ✅ Dependency Injection
- ✅ Clear separation of concerns
- ✅ Extensible architecture
- ✅ Type-safe error handling
- ✅ Reusable base classes
- ✅ Consistent patterns
- ✅ Easy to test
- ✅ Production-ready
