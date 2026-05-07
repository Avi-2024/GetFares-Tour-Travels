# Complete API Usage Guide

## 📚 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Usage Patterns](#usage-patterns)
3. [Examples](#examples)
4. [Best Practices](#best-practices)

## 🏗️ Architecture Overview

```
api/
├── core/              # Infrastructure (HTTP client, config)
├── endpoints/         # API endpoints (raw API calls)
├── services/          # Business logic layer
├── hooks/             # React hooks with state management
└── types.ts           # Shared TypeScript types
```

### Layer Responsibilities

**Core Layer** - HTTP communication
- HTTP client class
- Request/response interceptors
- Error handling
- Query building

**Endpoints Layer** - API definitions
- Raw API calls
- Type definitions
- No business logic

**Services Layer** - Business logic
- Data validation
- Data transformation
- Helper methods
- State management (localStorage)

**Hooks Layer** - React integration
- Loading states
- Error states
- Automatic state updates

## 🎯 Usage Patterns

### Pattern 1: Direct Endpoint Usage (Simple)
```typescript
import { authEndpoints } from '@/api';

// Direct API call
const response = await authEndpoints.login({ email, password });
console.log(response.data);
```

**When to use:**
- Simple API calls
- No state management needed
- Server-side operations

### Pattern 2: Service Layer (Business Logic)
```typescript
import { authService } from '@/api';

// Service handles token storage, validation, etc.
const user = await authService.login(email, password);
// Token automatically stored in localStorage
```

**When to use:**
- Need business logic
- Data transformation required
- Multiple API calls coordination

### Pattern 3: React Hooks (Components)
```typescript
import { useAuth } from '@/api';

function LoginForm() {
  const { login, loading, error } = useAuth();

  const handleSubmit = async () => {
    try {
      await login(email, password);
      // Success - loading/error handled automatically
    } catch (err) {
      // Error already in error state
    }
  };

  return (
    <div>
      {loading && <Spinner />}
      {error && <Alert>{error}</Alert>}
      <button onClick={handleSubmit}>Login</button>
    </div>
  );
}
```

**When to use:**
- React components
- Need loading/error states
- Automatic UI updates

## 📖 Examples

### Authentication

#### Login with Hook
```typescript
import { useAuth } from '@/api';

function LoginPage() {
  const { login, loading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, true); // rememberMe = true
      navigate('/dashboard');
    } catch (err) {
      // Error already set in hook
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <div className="error">{error}</div>}
      <button disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

#### Get Current User
```typescript
import { authService } from '@/api';

function Header() {
  const user = authService.getCurrentUser();
  
  return (
    <div>
      Welcome, {user?.fullName || 'Guest'}
    </div>
  );
}
```

### Leads Management

#### List Leads with Filters
```typescript
import { useLeads } from '@/api';

function LeadsPage() {
  const { list, loading, error, getStatusColor } = useLeads();
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'NEW',
    temperature: 'HOT'
  });

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const data = await list(filters);
        setLeads(data);
      } catch (err) {
        // Error handled by hook
      }
    };
    fetchLeads();
  }, [filters]);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  return (
    <div>
      {leads.map(lead => (
        <div key={lead.id} style={{ color: getStatusColor(lead.status) }}>
          {lead.fullName} - {lead.status}
        </div>
      ))}
    </div>
  );
}
```

#### Create Lead with Validation
```typescript
import { useLeads } from '@/api';

function CreateLeadForm() {
  const { create, loading, error } = useLeads();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    destinationId: '',
    budget: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLead = await create(formData);
      toast.success('Lead created successfully!');
      navigate(`/leads/${newLead.id}`);
    } catch (err: any) {
      // Service validates and checks duplicates
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        placeholder="Full Name"
        value={formData.fullName}
        onChange={e => setFormData({...formData, fullName: e.target.value})}
      />
      <input 
        placeholder="Phone"
        value={formData.phone}
        onChange={e => setFormData({...formData, phone: e.target.value})}
      />
      {error && <Alert>{error}</Alert>}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Lead'}
      </button>
    </form>
  );
}
```

#### Update Lead Status
```typescript
import { useLeads } from '@/api';

function LeadDetail({ leadId }: { leadId: string }) {
  const { update, loading } = useLeads();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await update(leadId, { status: newStatus });
      toast.success('Status updated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <select onChange={e => handleStatusChange(e.target.value)} disabled={loading}>
      <option value="NEW">New</option>
      <option value="CONTACTED">Contacted</option>
      <option value="QUALIFIED">Qualified</option>
    </select>
  );
}
```

### Bookings Management

#### Create Booking from Quotation
```typescript
import { useBookings } from '@/api';

function CreateBookingPage() {
  const { create, loading, error } = useBookings();
  const quotation = useQuotation(); // Your quotation data

  const handleCreateBooking = async () => {
    try {
      const booking = await create({
        quotationId: quotation.id,
        customerId: quotation.customerId,
        items: quotation.items,
        totalAmount: quotation.totalPrice,
        travelDate: quotation.travelDate,
      });
      
      toast.success('Booking created!');
      navigate(`/bookings/${booking.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <button onClick={handleCreateBooking} disabled={loading}>
      {loading ? 'Creating...' : 'Create Booking'}
    </button>
  );
}
```

#### Record Payment
```typescript
import { useBookings } from '@/api';

function PaymentForm({ bookingId }: { bookingId: string }) {
  const { recordPayment, loading, calculateBalance, getPaymentStatus } = useBookings();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('CARD');
  const booking = useBookingData(bookingId);

  const handlePayment = async () => {
    try {
      await recordPayment(bookingId, amount, method, 'TXN123');
      toast.success('Payment recorded!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const balance = calculateBalance(booking);
  const status = getPaymentStatus(booking);

  return (
    <div>
      <p>Balance: ₹{balance}</p>
      <p>Status: {status}</p>
      <input 
        type="number" 
        value={amount} 
        onChange={e => setAmount(Number(e.target.value))}
      />
      <select value={method} onChange={e => setMethod(e.target.value)}>
        <option value="CARD">Card</option>
        <option value="UPI">UPI</option>
        <option value="CASH">Cash</option>
      </select>
      <button onClick={handlePayment} disabled={loading}>
        Record Payment
      </button>
    </div>
  );
}
```

## ✅ Best Practices

### 1. Use Appropriate Layer

```typescript
// ❌ Bad - Direct endpoint in component with manual state
function Component() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await leadsEndpoints.list();
      // ...
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
}

// ✅ Good - Use hook
function Component() {
  const { list, loading, error } = useLeads();
  
  const fetchData = async () => {
    await list();
  };
}
```

### 2. Handle Errors Properly

```typescript
// ✅ Good - Show user-friendly errors
const { create, error } = useLeads();

try {
  await create(data);
  toast.success('Lead created!');
} catch (err: any) {
  toast.error(err.message || 'Something went wrong');
}

// Display error from hook
{error && <Alert>{error}</Alert>}
```

### 3. Use Loading States

```typescript
// ✅ Good - Disable buttons during loading
const { create, loading } = useLeads();

<button disabled={loading}>
  {loading ? 'Creating...' : 'Create Lead'}
</button>
```

### 4. Leverage Helper Methods

```typescript
// ✅ Good - Use service helpers
const { getStatusColor, getTemperatureColor } = useLeads();

<Badge color={getStatusColor(lead.status)}>
  {lead.status}
</Badge>

<Badge color={getTemperatureColor(lead.temperature)}>
  {lead.temperature}
</Badge>
```

### 5. Type Safety

```typescript
// ✅ Good - Use TypeScript types
import type { CreateLeadPayload } from '@/api';

const payload: CreateLeadPayload = {
  fullName: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com'
};

await create(payload); // Type-checked!
```

## 🚀 Advanced Patterns

### Custom Hook with Caching
```typescript
import { useLeads } from '@/api';
import { useQuery } from '@tanstack/react-query';

function useLeadsList(filters: any) {
  const { list } = useLeads();
  
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Optimistic Updates
```typescript
const { update } = useLeads();
const queryClient = useQueryClient();

const handleUpdate = async (id: string, data: any) => {
  // Optimistic update
  queryClient.setQueryData(['lead', id], (old: any) => ({
    ...old,
    ...data
  }));

  try {
    await update(id, data);
  } catch (err) {
    // Rollback on error
    queryClient.invalidateQueries(['lead', id]);
    throw err;
  }
};
```

## 📊 Summary

| Layer | Use Case | Example |
|-------|----------|---------|
| **Endpoints** | Simple API calls | `authEndpoints.login()` |
| **Services** | Business logic | `authService.login()` |
| **Hooks** | React components | `useAuth()` |

Choose the right layer based on your needs!
