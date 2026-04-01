# 🔄 Component Migration Examples

## Example 1: Login Page Migration

### Before (Old API)
```typescript
// pages/auth/LoginPage.tsx (OLD)
import { useState } from 'react';
import { authApi } from '@/api';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('auth_token', response.data.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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

### After (New Hook)
```typescript
// pages/auth/LoginPage.tsx (NEW)
import { useState } from 'react';
import { useAuth } from '@/api';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth(); // ✅ Much cleaner!
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password); // ✅ Handles storage automatically
      navigate('/dashboard');
    } catch (err) {
      // Error already in hook state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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

**Benefits:**
- ✅ 10 lines removed
- ✅ No manual state management
- ✅ Automatic token storage
- ✅ Cleaner error handling

---

## Example 2: Leads List Page Migration

### Before (Old API)
```typescript
// pages/leads/LeadsPage.tsx (OLD)
import { useState, useEffect } from 'react';
import { leadsApi } from '@/api';

function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ page: 1, limit: 20 });

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await leadsApi.list(filters);
        const data = response?.data?.data || response?.data || [];
        setLeads(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [filters]);

  const getStatusColor = (status: string) => {
    // Manual color logic
    if (status === 'NEW') return 'blue';
    if (status === 'CONTACTED') return 'yellow';
    return 'gray';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {leads.map(lead => (
        <div key={lead.id} style={{ color: getStatusColor(lead.status) }}>
          {lead.fullName}
        </div>
      ))}
    </div>
  );
}
```

### After (New Hook)
```typescript
// pages/leads/LeadsPage.tsx (NEW)
import { useState, useEffect } from 'react';
import { useLeads } from '@/api';

function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const { list, loading, error, getStatusColor } = useLeads(); // ✅ All in one!

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const data = await list(filters);
        setLeads(data);
      } catch (err) {
        // Error already handled
      }
    };
    fetchLeads();
  }, [filters, list]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {leads.map(lead => (
        <div key={lead.id} style={{ color: getStatusColor(lead.status) }}>
          {lead.fullName}
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ 15 lines removed
- ✅ No manual state management
- ✅ Helper methods included
- ✅ Consistent error handling

---

## Example 3: Create Lead Form Migration

### Before (Old API)
```typescript
// pages/leads/CreateLeadPage.tsx (OLD)
import { useState } from 'react';
import { leadsApi } from '@/api';
import { useNavigate } from 'react-router-dom';

function CreateLeadPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Manual validation
    if (!formData.phone || formData.phone.length < 10) {
      setError('Valid phone number is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Manual duplicate check
      const duplicateCheck = await leadsApi.checkDuplicate(
        formData.email, 
        formData.phone
      );
      if (duplicateCheck.data.isDuplicate) {
        setError('Lead already exists');
        setLoading(false);
        return;
      }

      const response = await leadsApi.create(formData);
      navigate(`/leads/${response.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.fullName}
        onChange={e => setFormData({...formData, fullName: e.target.value})}
      />
      <input 
        value={formData.phone}
        onChange={e => setFormData({...formData, phone: e.target.value})}
      />
      {error && <div className="error">{error}</div>}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Lead'}
      </button>
    </form>
  );
}
```

### After (New Hook)
```typescript
// pages/leads/CreateLeadPage.tsx (NEW)
import { useState } from 'react';
import { useLeads } from '@/api';
import { useNavigate } from 'react-router-dom';

function CreateLeadPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const { create, loading, error } = useLeads(); // ✅ Simple!
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // ✅ Service handles validation and duplicate check automatically
      const newLead = await create(formData);
      navigate(`/leads/${newLead.id}`);
    } catch (err) {
      // Error already in hook state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.fullName}
        onChange={e => setFormData({...formData, fullName: e.target.value})}
      />
      <input 
        value={formData.phone}
        onChange={e => setFormData({...formData, phone: e.target.value})}
      />
      {error && <div className="error">{error}</div>}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Lead'}
      </button>
    </form>
  );
}
```

**Benefits:**
- ✅ 25 lines removed
- ✅ Automatic validation
- ✅ Automatic duplicate check
- ✅ Much cleaner code

---

## Example 4: Quotations Page with Calculations

### Before (Old API)
```typescript
// pages/quotations/QuotationsPage.tsx (OLD)
import { useState, useEffect } from 'react';
import { quotationsApi } from '@/api';

function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const response = await quotationsApi.list();
        setQuotations(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotations();
  }, []);

  // Manual calculation
  const calculateMargin = (cost: number, price: number) => {
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  };

  // Manual formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div>
      {quotations.map(quote => (
        <div key={quote.id}>
          <p>Cost: {formatCurrency(quote.totalCost)}</p>
          <p>Price: {formatCurrency(quote.totalPrice)}</p>
          <p>Margin: {calculateMargin(quote.totalCost, quote.totalPrice).toFixed(2)}%</p>
        </div>
      ))}
    </div>
  );
}
```

### After (New Hook)
```typescript
// pages/quotations/QuotationsPage.tsx (NEW)
import { useState, useEffect } from 'react';
import { useQuotations } from '@/api';

function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const { 
    list, 
    loading, 
    calculateMargin, 
    formatCurrency 
  } = useQuotations(); // ✅ Everything included!

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const data = await list();
        setQuotations(data);
      } catch (err) {
        // Handled by hook
      }
    };
    fetchQuotations();
  }, [list]);

  return (
    <div>
      {quotations.map(quote => (
        <div key={quote.id}>
          <p>Cost: {formatCurrency(quote.totalCost)}</p>
          <p>Price: {formatCurrency(quote.totalPrice)}</p>
          <p>Margin: {calculateMargin(quote.totalCost, quote.totalPrice).toFixed(2)}%</p>
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ No duplicate helper functions
- ✅ Consistent formatting across app
- ✅ Reusable business logic

---

## Migration Checklist

### For Each Component:

1. **Identify API calls**
   - [ ] Find all `xxxApi.method()` calls
   - [ ] Note what data is being fetched/sent

2. **Replace with hook**
   - [ ] Import `useXxx` hook
   - [ ] Destructure needed methods
   - [ ] Remove manual state management

3. **Remove duplicate code**
   - [ ] Remove manual loading states
   - [ ] Remove manual error states
   - [ ] Remove helper functions (use from hook)

4. **Test**
   - [ ] Verify functionality works
   - [ ] Check loading states
   - [ ] Check error handling
   - [ ] Check success flows

---

## Quick Reference

### Old Pattern → New Pattern

```typescript
// OLD
import { leadsApi } from '@/api';
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
setLoading(true);
try {
  const response = await leadsApi.list();
  // ...
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}

// NEW
import { useLeads } from '@/api';
const { list, loading, error } = useLeads();
const data = await list();
```

### Benefits Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines of Code | 50+ | 20-30 | -40% to -60% |
| State Management | Manual | Automatic | 100% |
| Error Handling | Inconsistent | Consistent | 100% |
| Helper Functions | Duplicated | Centralized | 100% |
| Type Safety | Partial | Full | 100% |

---

## Next Steps

1. **Start with Login Page** (Easiest, 30 mins)
2. **Migrate Leads List** (Medium, 1 hour)
3. **Migrate Create Forms** (Medium, 1-2 hours)
4. **Migrate Complex Pages** (Hard, 2-3 hours)

**Total Migration Time: 1-2 days for all components**
