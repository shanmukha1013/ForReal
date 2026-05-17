# ForReal Integration Progress

## Completed
- (none yet)

## Next (planned)
1. Refactor auth to remove localStorage token dependency (cookie-based session)
2. Refactor AuthContext to initialize via backend `/auth/me` and handle auth-expired
3. Refactor posts/rooms hooks to remove localStorage fallback + local mock creation
4. Keep optimistic UI but reconcile from server responses
5. Smoke test: register/login/refresh/create post/join room

