# Auth Token Fix - Frontend & Backend

## Issue Summary
User reported: "Frontend Not Sending Auth Token"

## Root Cause Analysis

### Frontend Status: ✅ WORKING CORRECTLY
The frontend **IS** sending auth tokens correctly:

1. **Token Storage**: Login stores token in `localStorage.getItem("auth_token")` ✅
2. **Token Retrieval**: Both API clients read from localStorage ✅
3. **Token Attachment**: Request interceptor adds `Authorization: Bearer <token>` header ✅

**Evidence**:
- `crm-frontend/src/api/apiClient.ts` line 145: `tokenProvider = getAuthToken ?? (() => localStorage.getItem(STORAGE_TOKEN))`
- `crm-frontend/src/api/apiClient.ts` line 158-162: Interceptor attaches token to headers
- `crm-frontend/src/context/AuthContext.tsx` line 31: `STORAGE_TOKEN = "auth_token"`

### Backend Issue: ⚠️ ASYNC BUG FIXED

**File**: `backend/crm/modules/auth/auth.middleware.js`

**Bug**: The `requireAuth` middleware had an async/await bug where token blacklist check was not awaited, allowing revoked tokens to pass through.

**Before** (Lines 37-67):
```javascript
function requireAuth(req, res, next) {
  // ...
  authService.isTokenBlacklisted(token).then(isBlacklisted => {
    if (isBlacklisted) {
      return next(new AppError(401, "Token has been revoked", "TOKEN_REVOKED"));
    }
  }).catch(err => {
    req.log?.warn({ err }, "Blacklist check failed");
  });
  
  // ❌ Execution continues before blacklist check completes!
  req.context.user = { ... };
  return next();
}
```

**After** (Fixed):
```javascript
async function requireAuth(req, res, next) {
  // ...
  const isBlacklisted = await authService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    return next(new AppError(401, "Token has been revoked", "TOKEN_REVOKED"));
  }
  
  // ✅ Only proceeds after blacklist check completes
  req.context.user = { ... };
  return next();
}
```

## Testing Instructions

### 1. Test Frontend Token Sending

**Browser DevTools**:
```javascript
// Check token exists
localStorage.getItem('auth_token')

// Check API request headers
// Network tab → Select any /api/* request → Headers → Request Headers
// Should see: Authorization: Bearer eyJhbGc...
```

### 2. Test Backend Token Extraction

**Login and capture token**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"avi@gmail.com","password":"password123"}'
```

**Use token in API call**:
```bash
curl http://localhost:3000/api/leads \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Expected**: Returns leads data (only assigned leads for avi@gmail.com)

### 3. Test Token Blacklist

**Logout (blacklists token)**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Try using same token**:
```bash
curl http://localhost:3000/api/leads \
  -H "Authorization: Bearer <SAME_TOKEN>"
```

**Expected**: `401 Unauthorized - Token has been revoked`

## Deployment Checklist

- [x] Fix async/await bug in auth.middleware.js
- [ ] Restart backend server
- [ ] Clear browser localStorage and re-login
- [ ] Verify token in Network tab
- [ ] Test API calls return correct data
- [ ] Test logout blacklists token

## Summary

**Frontend**: ✅ No changes needed - already working correctly
**Backend**: ✅ Fixed async bug in requireAuth middleware

The issue was NOT that frontend wasn't sending tokens. The backend middleware had a race condition that could allow revoked tokens through.
