const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Diagnostic headers for identifying which server responded
app.use((req, res, next) => {
  res.set('X-Mock-API', 'true');
  res.set('X-Server-Name', 'mock-api');
  res.set('X-Route-Version', 'v1');
  // Ensure these headers are exposed to browsers/clients
  res.set('Access-Control-Expose-Headers', 'X-Mock-API,X-Server-Name,X-Route-Version');
  next();
});

const PORT = process.env.PORT || 4000;

// In-memory stores
const users = new Map(); // id -> user
const byUsername = new Map();
const byEmail = new Map();
const refreshStore = new Map(); // refreshToken -> userId
const rooms = new Map();
const posts = new Map();
const messages = [];

function makeToken(id) {
  return `mocktoken-${id}-${Date.now()}`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, displayName } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ message: 'username,email,password required' });
  if (byUsername.has(username)) return res.status(409).json({ message: 'Username already taken' });
  if (byEmail.has(email)) return res.status(409).json({ message: 'Email already registered' });
  const id = uuidv4();
  const user = { _id: id, username, email, displayName: displayName || username, password };
  users.set(id, user);
  byUsername.set(username, user);
  byEmail.set(email, user);
  const token = makeToken(id);
  const refreshToken = `refresh-${id}-${Date.now()}`;
  refreshStore.set(refreshToken, id);
  res.cookie('refreshToken', refreshToken, { httpOnly: true });
  return res.status(201).json({ token, refreshToken, user });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ message: 'identifier and password required' });
  const user = byUsername.get(identifier) || byEmail.get(identifier);
  if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
  const token = makeToken(user._id);
  const refreshToken = `refresh-${user._id}-${Date.now()}`;
  refreshStore.set(refreshToken, user._id);
  res.cookie('refreshToken', refreshToken, { httpOnly: true });
  return res.json({ token, refreshToken, user });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
  const userId = refreshStore.get(refreshToken);
  if (!userId) return res.status(401).json({ message: 'refresh_token_invalid' });
  const token = makeToken(userId);
  return res.json({ token });
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (refreshToken) refreshStore.delete(refreshToken);
  res.clearCookie('refreshToken');
  return res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ message: 'unauthorized' });
  // token format: mocktoken-<id>-<ts>
  const tokenBody = auth.replace(/^mocktoken-/, '');
  // Prefer extracting a UUID-like id from the tokenBody to handle dashes
  const uuidMatch = tokenBody.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const id = uuidMatch ? uuidMatch[0] : (tokenBody.lastIndexOf('-') === -1 ? tokenBody : tokenBody.slice(0, tokenBody.lastIndexOf('-')));
  console.log('[mock-api] /api/auth/me tokenBody=', tokenBody, 'extracted id=', id, 'usersHas=', users.has(id), 'usersCount=', users.size);
  const user = users.get(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user });
});

app.post('/api/rooms', (req, res) => {
  const { topic, description, category } = req.body || {};
  if (!topic) return res.status(400).json({ message: 'topic required' });
  const id = uuidv4();
  const room = { _id: id, topic, description, category, createdAt: new Date().toISOString(), participants: [] };
  rooms.set(id, room);
  return res.status(201).json({ room });
});

app.post('/api/posts', (req, res) => {
  const { content, author } = req.body || {};
  if (!content) return res.status(400).json({ message: 'content required' });
  const id = uuidv4();
  const post = { _id: id, content, author: author || { username: 'guest' }, createdAt: new Date().toISOString() };
  posts.set(id, post);
  return res.status(201).json({ post });
});

app.post('/chat', (req, res) => {
  const { text, recipientId, conversationId } = req.body || {};
  if (!text) return res.status(400).json({ message: 'text required' });
  const msg = { _id: uuidv4(), text, recipientId, conversationId, createdAt: new Date().toISOString() };
  messages.push(msg);
  return res.json({ ok: true, message: msg });
});

// Update user settings (bio/avatar)
app.put('/api/auth/update-settings', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ message: 'unauthorized' });
  const tokenBody = auth.replace(/^mocktoken-/, '');
  const uuidMatch = tokenBody.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const id = uuidMatch ? uuidMatch[0] : (tokenBody.lastIndexOf('-') === -1 ? tokenBody : tokenBody.slice(0, tokenBody.lastIndexOf('-')));
  console.log('[mock-api] /api/auth/update-settings tokenBody=', tokenBody, 'extracted id=', id, 'usersHas=', users.has(id), 'usersCount=', users.size);
  const user = users.get(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const updates = req.body || {};
  if (typeof updates.displayName !== 'undefined') user.displayName = updates.displayName;
  if (typeof updates.bio !== 'undefined') user.bio = updates.bio;
  if (typeof updates.avatar !== 'undefined') user.avatar = updates.avatar;
  users.set(id, user);
  return res.json({ user });
});

// Follow/unfollow user (simple toggle)
app.post('/api/user/:id/follow', (req, res) => {
  const targetId = req.params.id;
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ message: 'unauthorized' });
  const tokenBody = auth.replace(/^mocktoken-/, '');
  const uuidMatch = tokenBody.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const id = uuidMatch ? uuidMatch[0] : (tokenBody.lastIndexOf('-') === -1 ? tokenBody : tokenBody.slice(0, tokenBody.lastIndexOf('-')));
  console.log('[mock-api] /api/user/:id/follow tokenBody=', tokenBody, 'extracted id=', id, 'target=', targetId, 'usersHas=', users.has(id), 'usersCount=', users.size);
  const me = users.get(id);
  const target = users.get(targetId);
  if (!me || !target) return res.status(404).json({ message: 'User not found' });
  me.following = me.following || new Set();
  const following = new Set(Array.from(me.following));
  if (following.has(targetId)) {
    following.delete(targetId);
    me.following = following;
    users.set(id, me);
    return res.json({ ok: true, following: false });
  }
  following.add(targetId);
  me.following = following;
  users.set(id, me);
  return res.json({ ok: true, following: true });
});

// Simple explore search
app.get('/api/explore/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const matchedUsers = Array.from(users.values()).filter(u => u.username.toLowerCase().includes(q) || (u.displayName||'').toLowerCase().includes(q)).slice(0,10);
  const matchedPosts = Array.from(posts.values()).filter(p => p.content.toLowerCase().includes(q)).slice(0,10);
  const matchedRooms = Array.from(rooms.values()).filter(r => (r.topic||'').toLowerCase().includes(q)).slice(0,10);
  return res.json({ users: matchedUsers, posts: matchedPosts, rooms: matchedRooms });
});

// Debug: dump users (temporary)
app.get('/debug/users', (req, res) => {
  try {
    const all = Array.from(users.values()).map(u => ({ _id: u._id, username: u.username, email: u.email, displayName: u.displayName }));
    return res.json({ count: all.length, users: all });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => console.log(`Mock API listening on http://localhost:${PORT}`));
