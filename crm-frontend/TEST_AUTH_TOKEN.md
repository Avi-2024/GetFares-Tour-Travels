# Frontend Auth Token Test

## Issue Analysis

The frontend **IS correctly configured** to send auth tokens. Here's the flow:

### Token Storage
1. Login stores token: `localStorage.setItem("auth_token", token)` ✅
2. AuthContext reads token: `localStorage.getItem("auth_token")` ✅

### Token Attachment (Two Clients)

#### Legacy API Client (apiClient.ts)
```typescript
const legacyClient = createApiClient({
  getAuthToken: () => localStorage.getItem(STORAGE_TOKEN), // ✅
  onUnauthorized: handleLegacyUnauthorized,
});
```

Request interceptor attaches token:
```typescript
if (resolvedToken) {
  headers.Authorization = `Bearer ${resolvedToken}`; // ✅
}
```

#### Service Context Client (ServiceContext.tsx)
```typescript
apiClient.setAuthTokenProvider(
  () => token || localStorage.getItem("auth_token"), // ✅
);
```

## Test Steps

### 1. Verify Token in Browser
Open browser DevTools → Application → Local Storage → Check `auth_token` exists

### 2. Verify Token in Network Requests
Open browser DevTools → Network → Select any API call → Headers → Check:
```
Authorization: Bearer <token>
```

### 3. Test with Browser Console
```javascript
// Check token exists
console.log('Token:', localStorage.getItem('auth_token'));

// Test API call manually
fetch('http://localhost:3000/api/leads', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

## Expected Behavior

✅ **Frontend sends token correctly**
✅ **Backend receives token in Authorization header**
✅ **Backend extracts token in requireAuth middleware**

## Actual Problem

The user is likely:
1. Testing API directly (Postman/curl) **without Authorization header**
2. Using expired/invalid token
3. Backend middleware not extracting token correctly

## Solution

Check backend middleware extracts token:
```javascript
// backend/src/modules/auth/auth.middleware.js
const token = req.headers.authorization?.replace('Bearer ', '');
```

Verify token is valid and not blacklisted.
