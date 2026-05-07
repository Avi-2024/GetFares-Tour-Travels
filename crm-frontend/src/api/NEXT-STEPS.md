# 🎯 API Integration - Next Steps Guide

## ✅ Current Status

### Completed ✓
```
✅ Core Infrastructure
   - HTTP client with interceptors
   - Error handling
   - Query builder
   - Token management

✅ Endpoints (10/15)
   - auth.api.ts
   - rbac.api.ts
   - users.api.ts
   - leads.api.ts
   - quotations.api.ts
   - bookings.api.ts
   - payments.api.ts
   - visa.api.ts
   - customers.api.ts
   - notifications.api.ts

✅ Services (3/15)
   - auth.service.ts
   - leads.service.ts
   - bookings.service.ts

✅ Hooks (3/15)
   - useAuth.ts
   - useLeads.ts
   - useBookings.ts

✅ Documentation
   - README.md
   - IMPROVEMENTS.md
   - MIGRATION.md
   - USAGE.md
```

### Pending ⏳
```
⏳ Missing Endpoints (5)
   - campaigns.api.ts
   - destinations.api.ts
   - suppliers.api.ts
   - reports.api.ts
   - settings.api.ts

⏳ Missing Services (12)
   - rbac.service.ts
   - users.service.ts
   - quotations.service.ts
   - payments.service.ts
   - visa.service.ts
   - customers.service.ts
   - notifications.service.ts
   - campaigns.service.ts
   - destinations.service.ts
   - suppliers.service.ts
   - reports.service.ts
   - settings.service.ts

⏳ Missing Hooks (12)
   - useRbac.ts
   - useUsers.ts
   - useQuotations.ts
   - usePayments.ts
   - useVisa.ts
   - useCustomers.ts
   - useNotifications.ts
   - useCampaigns.ts
   - useDestinations.ts
   - useSuppliers.ts
   - useReports.ts
   - useSettings.ts
```

## 🚀 Phase 1: Complete Remaining Endpoints (Priority: HIGH)

### Step 1.1: Create Missing Endpoints
```bash
# Create these files in api/endpoints/

1. campaigns.api.ts
2. destinations.api.ts
3. suppliers.api.ts
4. reports.api.ts
5. settings.api.ts
```

### Step 1.2: Update endpoints/index.ts
```typescript
export * from './campaigns.api';
export * from './destinations.api';
export * from './suppliers.api';
export * from './reports.api';
export * from './settings.api';
```

**Estimated Time:** 2-3 hours

## 🎯 Phase 2: Complete Services Layer (Priority: HIGH)

### Step 2.1: Create Critical Services First
```bash
Priority Order:
1. quotations.service.ts  (High usage)
2. users.service.ts       (High usage)
3. customers.service.ts   (High usage)
4. payments.service.ts    (High usage)
5. visa.service.ts        (Medium usage)
6. notifications.service.ts (Medium usage)
```

### Step 2.2: Add Business Logic
Each service should include:
- Data validation
- Helper methods
- State management (localStorage if needed)
- Error handling
- Data transformation

**Estimated Time:** 4-6 hours

## 🔗 Phase 3: Complete Hooks Layer (Priority: MEDIUM)

### Step 3.1: Create Hooks for All Services
```bash
Priority Order:
1. useQuotations.ts
2. useUsers.ts
3. useCustomers.ts
4. usePayments.ts
5. useVisa.ts
6. useNotifications.ts
```

### Step 3.2: Add State Management
Each hook should include:
- Loading state
- Error state
- Success callbacks
- Error callbacks

**Estimated Time:** 3-4 hours

## 🧪 Phase 4: Testing & Migration (Priority: HIGH)

### Step 4.1: Test New API Structure
```typescript
// Create test file: api/__tests__/integration.test.ts

import { authService, leadsService } from '@/api';

describe('API Integration', () => {
  test('Auth service login', async () => {
    const result = await authService.login('test@example.com', 'password');
    expect(result.accessToken).toBeDefined();
  });

  test('Leads service create', async () => {
    const lead = await leadsService.create({
      fullName: 'Test Lead',
      phone: '+1234567890'
    });
    expect(lead.id).toBeDefined();
  });
});
```

### Step 4.2: Migrate One Component
```typescript
// Example: Migrate LoginPage.tsx

// Before (Old API)
import { authApi } from '@/api';
const response = await authApi.login({ email, password });

// After (New Hook)
import { useAuth } from '@/api';
const { login, loading, error } = useAuth();
await login(email, password);
```

**Estimated Time:** 2-3 hours per component

## 📊 Phase 5: Advanced Features (Priority: LOW)

### Step 5.1: Add Request Caching
```typescript
// Create api/core/cache.ts

export class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}
```

### Step 5.2: Add Request Retry Logic
```typescript
// Update api/core/http-client.ts

async retryRequest(config: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.instance.request(config);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### Step 5.3: Add Request Cancellation
```typescript
// Update api/core/http-client.ts

private cancelTokens = new Map<string, AbortController>();

cancel(requestId: string) {
  this.cancelTokens.get(requestId)?.abort();
  this.cancelTokens.delete(requestId);
}
```

**Estimated Time:** 4-6 hours

## 📝 Phase 6: Documentation & Training (Priority: MEDIUM)

### Step 6.1: Create Component Examples
```typescript
// Create api/examples/

1. LoginExample.tsx
2. LeadsListExample.tsx
3. CreateBookingExample.tsx
4. PaymentFormExample.tsx
```

### Step 6.2: Create Video Tutorials
- How to use new API structure
- Migration guide walkthrough
- Best practices demonstration

**Estimated Time:** 3-4 hours

## 🎓 Recommended Workflow

### Week 1: Foundation
```
Day 1-2: Complete remaining endpoints
Day 3-4: Create critical services
Day 5: Create critical hooks
```

### Week 2: Migration
```
Day 1-2: Test new API structure
Day 3-4: Migrate 5-10 components
Day 5: Fix issues and optimize
```

### Week 3: Advanced Features
```
Day 1-2: Add caching
Day 3: Add retry logic
Day 4: Add request cancellation
Day 5: Performance testing
```

### Week 4: Documentation
```
Day 1-2: Create examples
Day 3-4: Write documentation
Day 5: Team training
```

## 🔍 Quick Wins (Do First)

### 1. Complete Quotations Module (2-3 hours)
```typescript
// High impact, frequently used

✅ quotations.api.ts
✅ quotations.service.ts
✅ useQuotations.ts
```

### 2. Complete Users Module (1-2 hours)
```typescript
// Critical for RBAC and settings

✅ users.service.ts (already have users.api.ts)
✅ useUsers.ts
```

### 3. Migrate Login Page (30 mins)
```typescript
// Show immediate value

✅ Replace authApi with useAuth hook
✅ Demonstrate loading/error states
```

## 📈 Success Metrics

### Code Quality
- ✅ 100% TypeScript coverage
- ✅ No `any` or `unknown` types
- ✅ All endpoints have types
- ✅ All services have validation

### Developer Experience
- ✅ Consistent patterns across all modules
- ✅ Easy to add new endpoints
- ✅ Clear documentation
- ✅ Working examples

### Performance
- ✅ Response time < 500ms
- ✅ Loading states prevent duplicate requests
- ✅ Caching reduces API calls by 30%
- ✅ Error handling prevents crashes

## 🚨 Common Issues & Solutions

### Issue 1: TypeScript Errors
```typescript
// Problem: Type import errors
import { AxiosInstance } from 'axios';

// Solution: Use type imports
import { type AxiosInstance } from 'axios';
```

### Issue 2: Circular Dependencies
```typescript
// Problem: Service imports hook, hook imports service

// Solution: Keep dependencies one-way
// Endpoints → Services → Hooks
```

### Issue 3: State Management
```typescript
// Problem: Multiple components fetching same data

// Solution: Use React Query or Zustand
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['leads'],
  queryFn: () => leadsService.list()
});
```

## 🎯 Next Immediate Actions

### Today (2-3 hours)
1. ✅ Create campaigns.api.ts
2. ✅ Create destinations.api.ts
3. ✅ Create suppliers.api.ts
4. ✅ Test one endpoint

### Tomorrow (3-4 hours)
1. ✅ Create quotations.service.ts
2. ✅ Create users.service.ts
3. ✅ Create useQuotations.ts
4. ✅ Create useUsers.ts

### This Week (10-15 hours)
1. ✅ Complete all endpoints
2. ✅ Complete critical services
3. ✅ Complete critical hooks
4. ✅ Migrate 2-3 components
5. ✅ Write tests

## 📞 Need Help?

### Resources
- Check USAGE.md for examples
- Check MIGRATION.md for migration guide
- Check IMPROVEMENTS.md for detailed analysis
- Check README.md for architecture overview

### Questions?
- How to add new endpoint? → See USAGE.md
- How to migrate component? → See MIGRATION.md
- What's the best pattern? → See examples in USAGE.md
- Performance issues? → Check caching and retry logic

## 🎉 Summary

**Current Progress:** 40% Complete
**Estimated Time to 100%:** 20-25 hours
**Priority:** Complete endpoints → services → hooks → migration

**Start with:** Quotations module (highest impact)
**Then:** Users module (critical for RBAC)
**Finally:** Migrate components one by one

Good luck! 🚀
