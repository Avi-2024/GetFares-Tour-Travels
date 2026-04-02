# Quick Start Guide - OOP CMS Backend

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
# Create .env file
DATABASE_URL=postgresql://user:password@localhost:5432/database
NODE_ENV=development
PORT=3000
```

### 3. Run Database Migrations
```bash
psql -U user -d database -f database/migrations/001_add_crm_package_fields.sql
psql -U user -d database -f database/cms-schema.sql
```

### 4. Start Server
```bash
node cms/index.js
```

### 5. Test API
```bash
# Health check
curl http://localhost:3000/health

# List landing places
curl http://localhost:3000/api/cms/landing-places

# Create landing place
curl -X POST http://localhost:3000/api/cms/landing-places \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Switzerland",
    "description": "Alpine paradise",
    "tag": "Luxury",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

---

## 📚 Understanding the Architecture

### Class Structure
```
CmsApplication (Main App)
    ↓
LandingPlacesModule (DI Container)
    ↓
├── LandingPlacesRepository (Data Access)
├── LandingPlacesService (Business Logic)
├── LandingPlacesController (HTTP Handling)
└── LandingPlacesRouter (Route Config)
```

### Request Flow
```
HTTP Request
    ↓
Router → Controller → Service → Repository → Database
    ↓
Database Response
    ↓
Repository → Service → Controller → Router
    ↓
HTTP Response
```

---

## 🎯 Key Classes

### Entity
```javascript
class LandingPlace {
  constructor(data) { }
  static fromDatabase(row) { }
  toDatabase() { }
  validate() { }
}
```

### Repository
```javascript
class LandingPlacesRepository extends BaseRepository {
  async findActive() { }
  async countActive() { }
}
```

### Service
```javascript
class LandingPlacesService extends BaseService {
  async create(data) { }
  async listActive() { }
}
```

### Controller
```javascript
class LandingPlacesController extends BaseController {
  list(req, res, next) { }
  create(req, res, next) { }
}
```

---

## 🔧 Common Tasks

### Add New Endpoint
```javascript
// 1. Add method to Service
class LandingPlacesService extends BaseService {
  async findByTag(tag) {
    const rows = await this.repository.findAll({ tag });
    return rows.map(row => this.toEntity(row));
  }
}

// 2. Add method to Controller
class LandingPlacesController extends BaseController {
  findByTag(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this.service.findByTag(req.params.tag);
      this.sendSuccess(res, data);
    })(req, res, next);
  }
}

// 3. Add route
class LandingPlacesRouter {
  _setupRoutes() {
    // ... existing routes
    this._router.get('/tag/:tag', this._controller.findByTag.bind(this._controller));
  }
}
```

### Add Validation
```javascript
class LandingPlacesService extends BaseService {
  validateCreate(data) {
    if (!data.name) {
      throw new ValidationError('Name is required');
    }
    if (data.name.length < 3) {
      throw new ValidationError('Name must be at least 3 characters');
    }
    return data;
  }
}
```

### Add Custom Error
```javascript
export class MaxLimitError extends AppError {
  constructor(limit) {
    super(400, `Maximum ${limit} items allowed`, 'MAX_LIMIT');
    this.limit = limit;
  }
}

// Usage
throw new MaxLimitError(4);
```

---

## 🧪 Testing

### Unit Test
```javascript
import { LandingPlacesService } from './LandingPlaces.service.js';

describe('LandingPlacesService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
      countActive: jest.fn(),
    };
    service = new LandingPlacesService(mockRepository);
  });

  it('should create landing place', async () => {
    mockRepository.countActive.mockResolvedValue(2);
    mockRepository.create.mockResolvedValue({
      id: '1',
      name: 'Test',
      description: 'Test desc',
    });

    const result = await service.create({
      name: 'Test',
      description: 'Test desc',
      imageUrl: 'https://test.com/image.jpg',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Test');
  });

  it('should throw error when max limit reached', async () => {
    mockRepository.countActive.mockResolvedValue(4);

    await expect(
      service.create({ name: 'Test' })
    ).rejects.toThrow('Maximum 4 landing places allowed');
  });
});
```

### Integration Test
```javascript
import request from 'supertest';
import { CmsApplication } from './CmsApplication.js';

describe('Landing Places API', () => {
  let app;

  beforeAll(async () => {
    app = CmsApplication.create();
    await app.initialize();
  });

  afterAll(async () => {
    await app.shutdown();
  });

  it('should list landing places', async () => {
    const response = await request(app.app)
      .get('/api/cms/landing-places')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should create landing place', async () => {
    const response = await request(app.app)
      .post('/api/cms/landing-places')
      .send({
        name: 'Test Place',
        description: 'Test description',
        imageUrl: 'https://test.com/image.jpg',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Place');
  });
});
```

---

## 📖 Documentation

- **OOP_ARCHITECTURE.md** - Complete architecture guide
- **OOP_SUMMARY.md** - Implementation summary
- **This file** - Quick start guide

---

## 🆘 Troubleshooting

### Database Connection Error
```
Error: Database connection failed
```
**Solution**: Check DATABASE_URL in .env

### Module Not Found
```
Error: Cannot find module
```
**Solution**: Ensure package.json has `"type": "module"`

### Port Already in Use
```
Error: EADDRINUSE
```
**Solution**: Change PORT in .env or kill process on port 3000

---

## 🎓 Learn More

### SOLID Principles
- Read `OOP_ARCHITECTURE.md` section on SOLID
- Each principle explained with examples

### Design Patterns
- Repository Pattern
- Service Layer Pattern
- Dependency Injection
- Factory Pattern
- Singleton Pattern

### Best Practices
- One class, one responsibility
- Depend on abstractions
- Inject dependencies
- Write tests first
- Document public APIs

---

## ✅ Checklist

- [ ] Database setup complete
- [ ] Environment variables configured
- [ ] Server starts successfully
- [ ] Health check returns 200
- [ ] Can create landing place
- [ ] Can list landing places
- [ ] Tests pass

---

## 🚀 Next Steps

1. **Implement more modules** (Destinations, Packages, Visa)
2. **Add authentication** (JWT middleware)
3. **Add validation** (Request schemas)
4. **Write tests** (Unit + Integration)
5. **Add documentation** (Swagger/OpenAPI)

---

**Ready to code!** 🎉
