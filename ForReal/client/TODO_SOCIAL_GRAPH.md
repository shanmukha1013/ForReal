# TODO_SOCIAL_GRAPH (social connectivity layer)

## Goal
Complete discover → profile → follow → message flow without breaking auth, talks/posts, debate rooms, sockets, Render/Vercel.

## Steps
- [ ] Backend: add DM-by-username endpoint under `/api/messages/dm` (and safe aliases if needed)
- [ ] Backend: add relationship endpoint under `/api/users/:userId/relationship` for follow/back state
- [ ] Backend: add user search endpoints under `/api/search/users?q=` (optional) while keeping existing `/api/explore/search`
- [ ] Frontend: standardize Explore.jsx to use backend search response (remove mock merge or keep only fallback)
- [ ] Frontend: Profile.jsx
  - [ ] refetch relationship after follow/unfollow to update follow-back UI + counts
  - [ ] add “Message”/DM button that creates DM via `/api/messages/dm` and navigates to Messages
- [ ] Frontend: Messages.jsx
  - [ ] accept optional recipientUsername from navigation/state and auto-select conversation
- [ ] Safety: add Array.isArray checks + optional chaining in UI paths we touch
- [ ] Tests (manual)
  1) search user
  2) open profile
  3) follow user
  4) follow back
  5) refresh persistence
  6) open DM from profile
  7) send message
  8) realtime message delivery

