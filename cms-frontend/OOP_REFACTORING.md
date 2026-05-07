# OOP, SOLID, and DRY Principles Refactoring

## Overview
Complete refactoring of CMS frontend services and components to strictly follow Object-Oriented Programming, SOLID principles, and DRY (Don't Repeat Yourself) principles.

## Architecture Changes

### 1. Interface Segregation (ISP)

Created focused interfaces for each concern:

#### **IStorage.interface.ts**
```typescript
- IStorage: Base storage operations
- IThemeStorage: Theme-specific storage
- IUserStorage<T>: User-specific storage
- ITokenStorage: Token-specific storage
```

#### **IHttp.interface.ts**
```typescript
- IHttpClient: HTTP operations
- IRequestOptions: Request configuration
- IHttpInterceptor: Interceptor contract
```

#### **IAuth.interface.ts**
```typescript
- IAuthService<T>: Authentication operations
```

### 2. Single Responsibility Principle (SRP)

#### **Before:**
- `StorageService`: Handled theme, user, and generic storage (3 responsibilities)
- `ApiService`: HTTP client setup + request execution (2 responsibilities)

#### **After:**
- `ThemeStorageService`: Only theme storage
- `UserStorageService`: Only user storage
- `TokenStorageService`: Only token storage
- `HttpClient`: Only HTTP operations
- `AuthInterceptor`: Only authentication headers
- `ErrorInterceptor`: Only error handling

### 3. Dependency Inversion Principle (DIP)

#### **Before:**
```typescript
// Direct dependency on concrete class
import storageService from "./storage.service";
storageService.theme._setTheme("dark");
```

#### **After:**
```typescript
// Dependency on abstraction
constructor(themeStorage: IThemeStorage) {
  this.themeStorage = themeStorage;
}
this.themeStorage.saveTheme("dark");
```

### 4. Open/Closed Principle (OCP)

Created base classes that are open for extension but closed for modification:

```typescript
abstract class BaseStorage implements IStorage {
  // Base implementation
}

class LocalStorage extends BaseStorage {
  // Extended for localStorage
}

class SessionStorage extends BaseStorage {
  // Extended for sessionStorage
}
```

### 5. Singleton Pattern

All services now use proper Singleton pattern:

```typescript
class ThemeStorageService {
  private static instance: ThemeStorageService;
  
  private constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  public static getInstance(storage: IStorage = LocalStorage.getInstance()): ThemeStorageService {
    if (!ThemeStorageService.instance) {
      ThemeStorageService.instance = new ThemeStorageService(storage);
    }
    return ThemeStorageService.instance;
  }
}
```

## File Structure

```
src/shared/
├── interfaces/
│   ├── IAuth.interface.ts          # Auth service interface
│   ├── IHttp.interface.ts          # HTTP client interfaces
│   └── IStorage.interface.ts       # Storage interfaces
├── core/
│   └── BaseStorage.ts              # Base storage implementation
├── services/
│   ├── api.service.ts              # HttpClient (refactored)
│   ├── auth.service.ts             # AuthService (refactored)
│   └── storage.service.ts          # Storage services (refactored)
└── contexts/
    └── theme.context.tsx           # ThemeProvider (refactored)
```

## Key Improvements

### 1. Type Safety
- All services implement interfaces
- Generic types for reusability (`IUserStorage<T>`, `IAuthService<T>`)

### 2. Testability
- Dependencies injected via constructor
- Easy to mock interfaces for testing

### 3. Maintainability
- Each class has single responsibility
- Clear separation of concerns
- Consistent naming conventions

### 4. Extensibility
- New storage types can extend `BaseStorage`
- New interceptors can implement `IHttpInterceptor`
- Services depend on abstractions, not concrete implementations

### 5. DRY Compliance
- Base classes eliminate code duplication
- Shared interfaces prevent redundant type definitions
- Singleton pattern prevents multiple instances

## Usage Examples

### Storage Services
```typescript
// Theme storage
import { themeStorage } from "./services/storage.service";
themeStorage.saveTheme("dark");
const theme = themeStorage.loadTheme();

// User storage
import { userStorage } from "./services/storage.service";
userStorage.saveUser(user);
const currentUser = userStorage.loadUser();

// Token storage
import { tokenStorage } from "./services/storage.service";
tokenStorage.saveToken("abc123");
const token = tokenStorage.loadToken();
```

### HTTP Client
```typescript
import { apiService } from "./services/api.service";

// GET request
const data = await apiService.get<User>("/users/1");

// POST request
const result = await apiService.post<Response>("/login", { username, password });
```

### Auth Service
```typescript
import { authService } from "./services/auth.service";

// Login
await authService.login(username, password);

// Check authentication
if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
}

// Logout
await authService.logout();
```

### Theme Provider
```typescript
// Dependency injection (optional, uses default)
<ThemeProvider defaultTheme="dark">
  <App />
</ThemeProvider>

// In components
const { theme, toggleTheme, setTheme } = useTheme();
```

## SOLID Principles Applied

### ✅ Single Responsibility Principle
Each class has one reason to change:
- `ThemeStorageService`: Theme storage changes
- `UserStorageService`: User storage changes
- `TokenStorageService`: Token storage changes
- `HttpClient`: HTTP client changes
- `AuthService`: Authentication logic changes

### ✅ Open/Closed Principle
- `BaseStorage` is open for extension (LocalStorage, SessionStorage)
- Services are closed for modification (extend via interfaces)

### ✅ Liskov Substitution Principle
- `LocalStorage` and `SessionStorage` can replace `BaseStorage`
- All implementations can replace their interfaces

### ✅ Interface Segregation Principle
- Small, focused interfaces (IThemeStorage, IUserStorage, ITokenStorage)
- Clients depend only on methods they use

### ✅ Dependency Inversion Principle
- High-level modules depend on abstractions (interfaces)
- Low-level modules implement abstractions
- No direct dependencies on concrete classes

## Migration Guide

### Before
```typescript
import storageService from "./storage.service";
storageService.theme._setTheme("dark");
```

### After
```typescript
import { themeStorage } from "./services/storage.service";
themeStorage.saveTheme("dark");
```

### Before
```typescript
import apiService from "./api.service";
const data = await apiService.get("/users");
```

### After
```typescript
import { apiService } from "./services/api.service";
const data = await apiService.get("/users");
```

### Before
```typescript
import authService from "./auth.service";
await authService.login(username, password);
```

### After
```typescript
import { authService } from "./services/auth.service";
await authService.login(username, password);
```

## Benefits

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Dependency injection enables easy mocking and unit testing
3. **Scalability**: New features can be added without modifying existing code
4. **Type Safety**: Interfaces provide compile-time type checking
5. **Reusability**: Base classes and interfaces promote code reuse
6. **Consistency**: Uniform patterns across the codebase

## Next Steps

1. Update all imports in existing components
2. Add unit tests for each service
3. Create integration tests for service interactions
4. Document API contracts for each interface
5. Add JSDoc comments for public methods
