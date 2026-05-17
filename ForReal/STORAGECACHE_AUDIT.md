StorageCache Audit — prioritized conversion plan

Goal: identify local-only writes (`storageCache.*`) and prioritize converting critical flows to backend-backed persistence while keeping safe client-side caching for UX.

Priority order (per your spec):
1. auth/session state
2. rooms
3. posts/talks
4. messages
5. notifications
6. reactions
7. remaining UI caches

Summary Findings (high level):
- `storageCache` is used widely as an authoritative, persisted local store for rooms, posts, notifications, and user state.
- Many write operations are currently local-only (addRoom, addPost, addNotification, updateRoom, updatePost) often used for optimistic UX but sometimes without clear confirm/rollback paths.

Critical Conversion Recommendations (actionable):

1) Auth / Session (Highest)
- Files:
  - client/src/context/AuthContext.jsx
  - client/src/lib/storageCache.js (access token methods)
- Issues: `storageCache.setAccessToken()` and `setUser()` are the primary source of truth for session restoration. Potential stale/invalid tokens can be persisted.
- Recommendation:
  - Keep `storageCache` to persist tokens for UX, but centralize token lifecycle: always validate token on app load (call `/api/auth/me`) and attempt refresh (`/api/auth/refresh`) when `token_expired` is returned.
  - Treat `storageCache` as cache only; do not assume token validity without server check.
  - On logout, clear both storageCache and socket auth.

2) Rooms (Realtime Core)
- Files:
  - client/src/hooks/useGlobalRooms.js
  - client/src/pages/Rooms.jsx
  - client/src/pages/Room.jsx
  - client/src/pages/Explore.jsx
- Issues: `storageCache.addRoom`, `setRooms` and local merges in `useRooms` hide whether a room is persisted server-side. Could produce local-only rooms if create fails.
- Recommendation:
  - Keep optimistic create (existing `optimisticCreateRoom`), but always require server confirm (existing `confirmRoom`) — ensure confirmRoom replaces optimistic entry (already present).
  - Remove any code-paths that permanently persist local rooms without server confirmation.
  - Use `rooms:new` socket broadcast (implemented) as source for remote-created rooms; on receipt, insert into cache temporarily and refetch to canonicalize.

3) Posts / Talks
- Files:
  - client/src/hooks/useGlobalPosts.js
  - client/src/pages/PostCard.jsx
  - client/src/pages/Home.jsx
  - client/src/pages/Explore.jsx
  - client/src/api/posts.js
- Issues: `storageCache.addPost` and `updatePost` are used for optimistic updates; some flows add notifications locally without backend backing.
- Recommendation:
  - Keep optimistic UI but require server acknowledgement; perform `addPost` only after server returns (or use temporary optimistic id and replace on confirm).
  - Use server events / webhooks (or socket) to broadcast new posts to other clients.

4) Messages
- Files:
  - client/src/pages/Room.jsx
  - client/src/realtime/socket.js (message events)
- Issues: chat messages use socket in-memory broadcasts and storageCache updates; persistence already lives in POST /chat per comments.
- Recommendation:
  - Continue to persist messages via REST POST `/chat` and rely on socket broadcasts to notify others.
  - Remove local-only writes that pretend messages are persisted before server ack; instead add optimistic UI that is replaced on server ack.

5) Notifications
- Files:
  - client/src/pages/Notifications.jsx
  - client/src/hooks/useGlobalNotifications.js
  - client/src/components/PostCard.jsx
- Issues: notifications are often added locally (`addNotification`) without server persistence; risk of losing notifications or duplicates.
- Recommendation:
  - Persist important notifications on the server (e.g., likes/comments that target users) and use socket to push `notify:user:<id>` events.
  - Keep `storageCache` for quick reads and local read-state, but reconcile with server on page load.

6) Reactions
- Files:
  - client/src/components/PostCard.jsx
- Issues: `storageCache.updatePost` used to toggle reaction counts immediately.
- Recommendation:
  - Send reaction to server, update local optimistic state, and replace with server-confirmed state on response.
  - Ensure UI throttles repeated toggles and keeps a consistent toggle semantics.

7) Remaining UI caches
- Misc files scattered across pages/components where local caching is used for performance (profile follow state, saved posts, etc.).
- Recommendation:
  - Keep these caches but ensure they are eventually consistent with server: background sync on load, and reconcile on reconnect.

Concrete next steps to convert critical flows (ordered):
1. Implement server `/api/auth/refresh` (done) and add client-side logic to call it in `AuthContext` when API returns `token_expired` (high priority).
2. Ensure `useGlobalRooms` only persists rooms locally conditionally while awaiting server confirmation. Audit create paths and remove any permanent local-only writes.
3. Add server broadcast for posts (socket event `posts:new`) and rely on socket subscriptions for live feed.
4. Convert `storageCache.addNotification` usages to also POST to `/api/notifications` where appropriate; use socket push for immediate delivery.
5. Review `PostCard` and message flows to ensure optimistic updates have clear rollback on failure.
6. Add background reconciliation on app boot: call `/api/me`, `/api/rooms?since=...`, `/api/posts?since=...` and reconcile cache.

Where to start (recommended minimal critical fixes):
- Add client-side token refresh calls in `AuthContext` and wire `authenticateSocket()` to use refreshed tokens automatically.
- Convert `Rooms.jsx` and `useGlobalRooms` to rely on `rooms:new` for remote inserts and avoid persistent local writes without confirm.

Appendix: Files referencing `storageCache` (non-exhaustive highlights)
- client/src/context/AuthContext.jsx
- client/src/hooks/useGlobalUser.js
- client/src/hooks/useGlobalRooms.js
- client/src/hooks/useGlobalPosts.js
- client/src/hooks/useGlobalNotifications.js
- client/src/pages/Rooms.jsx
- client/src/pages/Room.jsx
- client/src/pages/Home.jsx
- client/src/pages/Explore.jsx
- client/src/pages/PostCard.jsx
- client/src/pages/Profile.jsx
- client/src/pages/Notifications.jsx
- client/src/components/PostCard.jsx

If you want, I can now:
- Implement client `AuthContext` refresh-on-401 flow and automatic socket re-auth.
- Start converting the top-priority flows in `useGlobalRooms` and `useGlobalPosts` to strictly require server confirmation.

Which specific conversion should I implement next? (I can start with `AuthContext` token refresh and socket re-auth, as it's foundational.)
