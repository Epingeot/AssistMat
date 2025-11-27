# Error Boundary Testing Guide

## Test Errors Added

Two test errors have been added to the codebase for testing error boundaries:

### 1. Auth-Level Error (AuthContext.jsx:190)
```javascript
// 🧪 TEST: Uncomment to simulate auth error
// throw new Error('TEST: Simulated authentication error')
```

**Tests:** Auth Provider Error Boundary
**Expected Result:**
- Custom auth error screen with 🔒 icon
- "Erreur d'authentification" message
- "Se déconnecter et réessayer" button
- Error details in dev mode (expandable)

### 2. Root-Level Error (App.jsx:37)
```javascript
// 🧪 TEST: Uncomment to simulate router error (caught by root Error Boundary)
// throw new Error('TEST: Simulated router/app error')
```

**Tests:** App Root Error Boundary
**Expected Result:**
- Generic error screen with ⚠️ icon
- "Erreur Critique" title
- "Réessayer" and "Retour accueil" buttons
- Error details in dev mode (expandable)

## How to Test

### Test 1: Auth Error Boundary

1. **Enable the test error:**
   - Open `src/contexts/AuthContext.jsx`
   - Go to line 190
   - Uncomment the throw statement:
     ```javascript
     throw new Error('TEST: Simulated authentication error')
     ```

2. **Run the app:**
   ```bash
   npm run dev
   ```

3. **Expected behavior:**
   - App loads
   - AuthProvider throws error
   - Auth Error Boundary catches it
   - You see the custom auth error screen with logout button

4. **Verify:**
   - ✅ Custom error UI appears
   - ✅ "Se déconnecter et réessayer" button works
   - ✅ Error details show in dev mode
   - ✅ Console shows: "ErrorBoundary caught error: ... boundary: Auth Provider"

5. **Disable test:**
   - Comment out the throw statement again

---

### Test 2: Root Error Boundary

1. **Enable the test error:**
   - Open `src/App.jsx`
   - Go to line 37
   - Uncomment the throw statement:
     ```javascript
     throw new Error('TEST: Simulated router/app error')
     ```

2. **Run the app:**
   ```bash
   npm run dev
   ```

3. **Expected behavior:**
   - App loads
   - AppRoutes throws error
   - Root Error Boundary catches it
   - You see the generic error screen with retry/home buttons

4. **Verify:**
   - ✅ Generic error UI appears
   - ✅ "Réessayer" button works (resets error state)
   - ✅ "Retour accueil" button navigates to /
   - ✅ Error details show in dev mode
   - ✅ Console shows: "ErrorBoundary caught error: ... boundary: App Root"

5. **Disable test:**
   - Comment out the throw statement again

---

## Error Boundary Hierarchy

```
ErrorBoundary (App Root) - Catches everything
├── BrowserRouter
    ├── ErrorBoundary (Auth Provider) - Catches auth errors
        ├── AuthContext.Provider
            ├── AppRoutes
                ├── Login Route
                ├── Protected Route
                    ├── Dashboards (to be wrapped next)
```

## Next Steps

After testing these two boundaries:
- ✅ App Root Error Boundary
- ✅ Auth Provider Error Boundary
- ⏳ Dashboard Error Boundaries (ParentDashboard, AssistanteDashboard)
- ⏳ Component Error Boundaries (MapView)

## Production Behavior

**Important:** In production builds (`npm run build`):
- Error details are hidden from users
- Only custom error messages shown
- Errors still logged to console (can be sent to error tracking service)
- Users get friendly recovery options

## Clean Up

Before committing, **remember to comment out all test errors**:
- `src/contexts/AuthContext.jsx:190`
- `src/App.jsx:37`
