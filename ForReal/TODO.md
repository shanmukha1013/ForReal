# Auth/UI stabilization plan

## Step 1 — Diagnose login visibility (targeted)
- [ ] Adjust Sign In button styling/disabled state in `ForReal/client/src/pages/Login.jsx` to ensure strong contrast in dark theme.
- [ ] Ensure disabled/loading styles don’t reduce opacity/text contrast.

## Step 2 — Fix login behavior correctness
- [ ] Ensure `Login.jsx` uses AuthContext correctly and redirect occurs after successful login.
- [ ] Verify `from` redirect state and default `/home` destination.

## Step 3 — Implement real signup integration
- [ ] Update `ForReal/client/src/context/AuthContext.jsx` signup() to call `api.auth.register`.
- [ ] After signup success, perform auto-login if token/user is returned; otherwise redirect to `/login`.

## Step 4 — Create Signup page
- [ ] Add `ForReal/client/src/pages/Signup.jsx` using the existing premium cinematic/intro + glass theme.
- [ ] Implement username/password/displayName fields and submit via AuthContext.signup.

## Step 5 — Add routing
- [ ] Update `ForReal/client/src/App.jsx` routes for `/signup` and `/register` (public).

## Step 6 — Connect “Create one”
- [ ] Update `Login.jsx` Link to point to `/signup`.

## Step 7 — Verify protected routes
- [ ] Confirm unauthenticated users redirect to `/login`.
- [ ] Confirm authenticated users can enter `/` (Home) without loops.

## Step 8 — Smoke test
- [ ] Manually test login + signup end-to-end in browser.
- [ ] Run client lint/build if available.

