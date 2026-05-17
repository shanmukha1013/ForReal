# ForReal Platform - Manual Multiuser Validation Checklist

## Prerequisites
- Backend running on port 5000: `$env:MONGO_URI='mongodb://localhost:27017/forreal'; npm run dev`
- Frontend running on port 5173: `npm run dev`
- MongoDB running on localhost:27017
- Open two separate browser windows (or private windows for different accounts)
- DevTools open in each for Network tab and Console logs

---

## SETUP: Create Test Accounts

### Account 1: Alice
```
URL: http://localhost:5173/signup
Username: alice_real_test
Email: alice@forreal.test
Password: TestPass123!
Display Name: Alice Tester
```
✅ Expected: Account created, redirect to login or direct login success

### Account 2: Bob
```
URL: http://localhost:5173/signup (in separate window)
Username: bob_real_test  
Email: bob@forreal.test
Password: TestPass123!
Display Name: Bob Tester
```
✅ Expected: Account created, redirect to login

---

## TEST PHASE 1: Session Persistence

### T1.1 - Single User Refresh
**Alice's Window:**
- [ ] Click "Explore" or navigate to home page
- [ ] Open DevTools → Application → Cookies/Storage
- [ ] Verify `forreal_access_token` exists
- [ ] **ACTION**: Refresh page (F5)
- [ ] ✅ Expected: User remains logged in (no redirect to login)
- [ ] ✅ Expected: User data visible (username, avatar, etc.)
- [ ] ✅ Socket should reconnect automatically
- [ ] **Check Console**: Verify `[Socket] connected` or similar

### T1.2 - Token Persistence
**Alice's Window:**
- [ ] DevTools → Application → localStorage
- [ ] Look for keys: `forreal_access_token`, `forreal_user`
- [ ] ✅ Expected: Tokens/user data properly stored
- [ ] Close DevTools

### T1.3 - Hard Refresh
**Alice's Window:**
- [ ] **ACTION**: Hard refresh with Ctrl+Shift+R (clears cache)
- [ ] ✅ Expected: Still logged in (localStorage unaffected by hard refresh)
- [ ] ✅ Expected: Socket reconnects

---

## TEST PHASE 2: Multiuser Room Interaction

### T2.1 - Create Room (Alice)
**Alice's Window:**
- [ ] Navigate to "Rooms" or create room UI
- [ ] Click "Create Room" or similar
- [ ] Fill in:
  - Title: `Test Room - May 16`
  - Description: `Multiuser validation test`
- [ ] **ACTION**: Submit
- [ ] ✅ Expected: Room created, Alice redirected to room page
- [ ] ✅ Expected: Room ID visible in URL or header
- [ ] **Copy the Room ID** (e.g., `/rooms/123abc`)

### T2.2 - Room Appears in Bob's Feed (Realtime)
**Bob's Window:**
- [ ] Already logged in, on home/explore page
- [ ] ✅ Expected: New room from Alice appears instantly (no refresh needed)
- [ ] ✅ Expected: Room title, avatar, creator name visible
- [ ] **If not visible**: Check DevTools Console for errors
- [ ] **If not visible**: Manually refresh to see if issue is socket vs REST

### T2.3 - Join Room (Bob)
**Bob's Window:**
- [ ] Click on the room created by Alice
- [ ] ✅ Expected: Room opens, Bob can see room details
- [ ] **Check participant count**: Should show Alice + Bob

### T2.4 - Participant List Sync (Both Windows)
**Alice's Window:**
- [ ] While in room, check participant list/member count
- [ ] Should show: Alice (creator) + Bob (joined)
- [ ] ✅ Expected: Count shows 2 members

**Bob's Window:**
- [ ] Check same participant list
- [ ] ✅ Expected: Shows Alice + Bob with correct count

---

## TEST PHASE 3: Message Synchronization

### T3.1 - Alice Sends Message
**Alice's Window:**
- [ ] Type in chat input: "Hello Bob, can you see this?"
- [ ] **ACTION**: Send message (Enter or Send button)
- [ ] ✅ Expected: Message appears instantly in Alice's chat
- [ ] ✅ Expected: Message has timestamp and "You" label
- [ ] Check DevTools Console: Should see `message:new` socket event

### T3.2 - Bob Receives Message (Realtime)
**Bob's Window:**
- [ ] ✅ Expected: Alice's message appears instantly WITHOUT refresh
- [ ] ✅ Expected: Message shows "Alice Tester" as sender
- [ ] ✅ Expected: Same timestamp as Alice's window
- [ ] Check DevTools Console: Should see `message:new` socket event

### T3.3 - Bob Sends Reply
**Bob's Window:**
- [ ] Type: "Yes Alice, I see your message loud and clear!"
- [ ] **ACTION**: Send
- [ ] ✅ Expected: Message appears in Bob's chat

### T3.4 - Alice Receives Reply (Realtime)
**Alice's Window:**
- [ ] ✅ Expected: Bob's message appears instantly
- [ ] ✅ Expected: Message shows "Bob Tester" as sender
- [ ] ✅ No duplicate messages
- [ ] No stale/out-of-order messages

### T3.5 - Both Clients Send Rapidly
**Alice's Window:**
- [ ] Send: "1", "2", "3" rapidly
- [ ] Measure timing in console

**Bob's Window:**
- [ ] Send: "A", "B", "C" rapidly
- [ ] Measure timing

**Both Windows:**
- [ ] ✅ Expected: All 6 messages received in correct order
- [ ] ✅ Expected: No duplicates or gaps
- [ ] ✅ Expected: Timestamps make sense

---

## TEST PHASE 4: Reconnection Stability

### T4.1 - Simulate Network Disconnect (Alice)
**Alice's Window:**
- [ ] DevTools → Network tab
- [ ] Find the WebSocket connection (look for WS, green)
- [ ] Right-click → Block URL (or toggle throttling to offline)
- [ ] ✅ Expected: DevTools shows WebSocket closed
- [ ] **Keep window open** - do NOT refresh

### T4.2 - Attempt Message Send While Disconnected
**Alice's Window:**
- [ ] Try to type and send message
- [ ] ⚠️ Expected behavior: Either
  - Message queued locally, or
  - Error toast appears, or
  - Input disabled
- [ ] Check Console for error handling

### T4.3 - Restore Network
**Alice's Window:**
- [ ] DevTools → Re-enable network (unblock URL or restore throttling)
- [ ] Wait 2-3 seconds
- [ ] ✅ Expected: WebSocket reconnects (see green WS line)
- [ ] ✅ Expected: Console shows `[Socket] reconnect...` or connected message
- [ ] ✅ Expected: Alice still in room with correct member list

### T4.4 - Receive Bob's Messages After Reconnect
**Bob's Window:**
- [ ] Send: "Alice, are you still there?"

**Alice's Window:**
- [ ] ✅ Expected: Bob's message arrives after reconnect
- [ ] ✅ Expected: No gaps in message history

---

## TEST PHASE 5: Avatar/Profile Updates

### T5.1 - Alice Changes Avatar
**Alice's Window:**
- [ ] Navigate to Profile or Settings
- [ ] Upload or change avatar image
- [ ] Save changes
- [ ] ✅ Expected: Avatar updates in Alice's window
- [ ] Check backend logs: Should see avatar update request

### T5.2 - Bob Sees Avatar Update (Realtime)
**Bob's Window:**
- [ ] While in room with Alice, observe Alice's avatar
- [ ] ✅ Expected: Avatar updates in realtime WITHOUT refresh
- [ ] If not: Check if socket event needs to be sent for avatar change

### T5.3 - Profile Name Update (Alice)
**Alice's Window:**
- [ ] Go to Profile/Settings
- [ ] Change display name from "Alice Tester" to "Alice ✨ Tester"
- [ ] Save
- [ ] ✅ Expected: Name updates immediately in Alice's view

**Bob's Window:**
- [ ] ✅ Expected: See Alice's new name in chat messages or participant list
- [ ] ✅ Expected: Update in realtime

---

## TEST PHASE 6: Multi-Tab Synchronization

### T6.1 - Open Two Tabs as Alice
**Tab 1:**
- Open http://localhost:5173/
- Log in as Alice (or already logged in)
- ✅ Expected: Socket connected

**Tab 2:**
- Open http://localhost:5173/explore
- ✅ Expected: Using same session (no re-login needed)
- ✅ Expected: Both tabs show Alice as logged in

### T6.2 - Navigate to Same Room in Both Tabs
**Tab 1:**
- Open test room created earlier

**Tab 2:**
- Open same test room
- ✅ Expected: Both show same room content
- ✅ Expected: Both show same participant list

### T6.3 - Send Message in Tab 1
**Tab 1:**
- Send: "Message from Tab 1"

**Tab 2:**
- ✅ Expected: Message appears instantly WITHOUT refresh
- Check DevTools Console: Verify socket event received

### T6.4 - Send Message in Tab 2
**Tab 2:**
- Send: "Message from Tab 2"

**Tab 1:**
- ✅ Expected: Message appears instantly
- ✅ Expected: Both tabs see all messages in order

### T6.5 - Close Tab 1
**Tab 2:**
- Send: "Can you still see me Tab 1?"
- Wait 2 seconds
- **ACTION**: Close Tab 1 completely (✕ button)
- Check Tab 2 console for disconnect event

- [ ] ✅ Expected: Bob (in other window) does NOT see participant count drop to 0
- [ ] ✅ Expected: Alice still "in room" because Tab 2 is still open

---

## TEST PHASE 7: Notifications

### T7.1 - Notification Delivery
**Alice's Window:**
- [ ] Navigate away from room to Home/Explore
- **Bob's Window:**
  - [ ] Send message while Alice is not viewing the room
  - [ ] ✅ Expected: Alice receives notification (badge, toast, etc.)

### T7.2 - Click Notification
**Alice's Window:**
- [ ] Click notification
- [ ] ✅ Expected: Redirected to room where message was sent
- [ ] ✅ Expected: Message visible in chat

---

## TEST PHASE 8: Error Scenarios

### E8.1 - Send Message with Invalid Room ID
**Alice's Window:**
- [ ] Manually craft socket event with fake roomId
- [ ] Check Console: ✅ Expected error message logged
- [ ] ✅ Expected: No crash, graceful error

### E8.2 - Session Expires
**Alice's Window:**
- [ ] Wait 2+ hours (or simulate by setting short JWT TTL)
- [ ] Try to interact with room
- [ ] ⚠️ Expected: Either
  - Auto-refresh token silently, or
  - Redirect to login with friendly message

### E8.3 - Rejoin After Leaving
**Alice's Window:**
- [ ] In room, click "Leave Room"
- [ ] ✅ Expected: Removed from room
- [ ] Join same room again
- [ ] ✅ Expected: Rejoined successfully

---

## TEST PHASE 9: Performance

### P9.1 - Multiple Rapid Messages
**Both Windows:**
- [ ] Send 20+ messages rapidly (2-3 per second)
- [ ] Measure response time: <500ms expected
- [ ] ✅ Expected: No message loss or reordering
- [ ] Check CPU/Memory in DevTools Performance tab

### P9.2 - Socket Connection Stability
**Both Windows:**
- [ ] Keep browser open for 10+ minutes
- [ ] Periodically send messages
- [ ] ✅ Expected: Connection remains stable
- [ ] ✅ Expected: No automatic reconnects without reason
- [ ] Check server logs: No errors logged

---

## FINAL VALIDATION CHECKLIST

### Connection Health
- [ ] ✅ Both clients stay connected for full duration
- [ ] ✅ No spurious reconnects
- [ ] ✅ No `connect_error` messages in console

### Data Consistency
- [ ] ✅ Messages received by all participants
- [ ] ✅ No duplicate messages
- [ ] ✅ Correct message order
- [ ] ✅ Correct sender attribution

### User Experience
- [ ] ✅ No confusing error messages
- [ ] ✅ Clear feedback on actions (message sent, etc.)
- [ ] ✅ Responsive UI (no freezing)
- [ ] ✅ Smooth animations/transitions

### Backend Health
- [ ] ✅ No errors in server logs
- [ ] ✅ No memory leaks (monitor process)
- [ ] ✅ Database queries performant
- [ ] ✅ Socket event throughput healthy

---

## ISSUES FOUND

### Critical (Block Release)
- [ ] None yet

### High (Must Fix)
- [ ] None yet

### Medium (Should Fix)
- [ ] None yet

### Low (Nice to Have)
- [ ] None yet

---

## SIGN-OFF

- **Tester**: [Your Name]
- **Date**: [Today]
- **Overall Status**: 🟢 PASS / 🟡 PARTIAL / 🔴 FAIL
- **Recommendation**: Can proceed to / needs fixes before

**Notes:**
```
[Add any additional findings here]
```

---

*Generated: May 16, 2026*
