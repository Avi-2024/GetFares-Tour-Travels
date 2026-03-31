# Quick Migration Guide

## ✅ What's Done

### New Structure Created
```
api/
├── core/                    ✅ Infrastructure layer
│   ├── http-client.ts      ✅ Reusable HTTP client
│   ├── api-client.ts       ✅ Configured instance
│   ├── query-builder.ts    ✅ Query utilities
│   └── index.ts            ✅ Exports
│
├── endpoints/               ✅ Clean API endpoints
│   ├── auth.api.ts         ✅ Authentication
│   ├── rbac.api.ts         ✅ Roles & permissions
│   ├── users.api.ts        ✅ Users
│   ├── leads.api.ts        ✅ Leads
│   ├── quotations.api.ts   ✅ Quotations
│   ├── bookings.api.ts     ✅ Bookings
│   ├── payments.api.ts     ✅ Payments
│   ├── visa.api.ts         ✅ Visa
│   ├── customers.api.ts    ✅ Customers
│   ├── notifications.api.ts✅ Notifications
│   └── index.ts            ✅ Exports
```

## 🚀 How to Use

### Import New Endpoints
```typescript
// ✅ New way (clean & organized)
import { 
  authEndpoints, 
  leadsEndpoints, 
  bookingsEndpoints 
} from '@/api';

// Usage
const login = await authEndpoints.login({ email, password });
const leads = await leadsEndpoints.list({ page: 1 });
const booking = await bookingsEndpoints.getById(id);
```

### Old Way Still Works
```typescript
// ⚠️ Old way (still works, but deprecated)
import { authApi, leadsApi, bookingsApi } from '@/api';

// Usage (same as before)
const login = await authApi.login({ email, password });
const leads = await leadsApi.list({ page: 1 });
```

## 📝 Migration Steps

### Step 1: Try New API (No Breaking Changes)
```typescript
// In any component, try the new API
import { leadsEndpoints } from '@/api';

const fetchLeads = async () => {
  const response = await leadsEndpoints.list({ page: 1, limit: 20 });
  console.log(response.data);
};
```

### Step 2: Gradually Replace Old Imports
```typescript
// Before
import { leadsApi } from '@/api';
const leads = await leadsApi.list();

// After
import { leadsEndpoints } from '@/api';
const leads = await leadsEndpoints.list();
```

### Step 3: Update One Component at a Time
- No rush, both APIs work
- Test each component after migration
- Old API will be removed in future

## 🎯 Key Benefits

### 1. Better Organization
```
Before: 20+ files in one folder
After: Organized in core/ and endpoints/
```

### 2. Type Safety
```typescript
// ✅ Full TypeScript support
interface CreateLeadPayload {
  fullName: string;
  phone: string;
  email?: string;
}

leadsEndpoints.create(payload); // Type-checked!
```

### 3. Consistent Patterns
```typescript
// All endpoints follow same pattern
xxxEndpoints.list(params)
xxxEndpoints.create(payload)
xxxEndpoints.getById(id)
xxxEndpoints.update(id, payload)
xxxEndpoints.delete(id)
```

### 4. Easy to Extend
```typescript
// Add new endpoint in endpoints/new-feature.api.ts
export const newFeatureEndpoints = {
  list: () => apiClient.get('/api/new-feature'),
  create: (data) => apiClient.post('/api/new-feature', data),
};

// Export in endpoints/index.ts
export * from './new-feature.api';

// Use anywhere
import { newFeatureEndpoints } from '@/api';
```

## 🔧 Advanced Usage

### Custom Headers
```typescript
import { apiClient } from '@/api';

const data = await apiClient.get('/api/custom', {
  headers: { 'X-Custom-Header': 'value' }
});
```

### Skip Authentication
```typescript
const data = await apiClient.post('/api/public', payload, {
  skipAuth: true
});
```

### Custom Token
```typescript
const data = await apiClient.get('/api/data', {
  token: 'custom-token'
});
```

### File Upload
```typescript
const formData = new FormData();
formData.append('file', file);

await apiClient.post('/api/upload', formData);
// Content-Type automatically set to multipart/form-data
```

## 📊 What's Better

| Feature | Old API | New API |
|---------|---------|---------|
| Organization | ❌ Flat | ✅ Structured |
| Type Safety | ⚠️ Partial | ✅ Full |
| Consistency | ❌ Mixed | ✅ Uniform |
| Testability | ❌ Hard | ✅ Easy |
| Documentation | ❌ Scattered | ✅ Centralized |
| Error Handling | ⚠️ Inconsistent | ✅ Standardized |

## 🎓 Examples

### Authentication
```typescript
import { authEndpoints } from '@/api';

// Login
const response = await authEndpoints.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get profile
const profile = await authEndpoints.getProfile();

// Toggle active status
await authEndpoints.toggleActive(true);
```

### Leads Management
```typescript
import { leadsEndpoints } from '@/api';

// List with filters
const leads = await leadsEndpoints.list({
  page: 1,
  limit: 20,
  status: 'NEW',
  temperature: 'HOT'
});

// Create lead
const newLead = await leadsEndpoints.create({
  fullName: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com'
});

// Update lead
await leadsEndpoints.update(leadId, {
  status: 'CONTACTED',
  notes: 'Called customer'
});

// Assign lead
await leadsEndpoints.assign(leadId, agentId, 'Manual assignment');
```

### Bookings
```typescript
import { bookingsEndpoints } from '@/api';

// List bookings
const bookings = await bookingsEndpoints.list({ status: 'CONFIRMED' });

// Get booking details
const booking = await bookingsEndpoints.getById(bookingId);

// Record payment
await bookingsEndpoints.recordPayment(bookingId, 5000, 'CARD', 'TXN123');

// Upload document
await bookingsEndpoints.uploadDocument(bookingId, file, 'PASSPORT');
```

## ⚡ Next Steps

1. ✅ Review this guide
2. ⏳ Try new API in one component
3. ⏳ Gradually migrate other components
4. ⏳ Report any issues
5. ⏳ Enjoy cleaner code!

## 📞 Need Help?

- Check `IMPROVEMENTS.md` for detailed analysis
- Check `README.md` for full documentation
- Old API still works - no pressure to migrate immediately
