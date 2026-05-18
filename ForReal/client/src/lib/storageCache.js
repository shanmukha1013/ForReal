// ─────────────────────────────────────────────────────────────────────────────
// storageCache.js – Centralized localStorage Management
// ─────────────────────────────────────────────────────────────────────────────
// Prevents fragmented state by:
// • Caching all localStorage reads in memory
// • Providing typed getters/setters
// • Triggering update callbacks for global state sync
// • Preventing repeated JSON parsing (performance)
// • Ensuring consistency across all components
// ─────────────────────────────────────────────────────────────────────────────

class StorageCache {
  constructor() {
    // In-memory cache to avoid repeated localStorage parsing
    this.cache = {
      user: null,
      posts: [],
      rooms: [],
      notifications: [],
      follows: {},
      saved: [],
      accessToken: null,
    };

    // Subscribers for reactive updates
    this.subscribers = {
      user: [],
      posts: [],
      rooms: [],
      notifications: [],
      follows: [],
      saved: [],
    };

    // Initialize cache from localStorage
    this._initializeCache();
    this._attachStorageListener();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal: Initialize cache from localStorage
  // ─────────────────────────────────────────────────────────────────────────
  _initializeCache() {
    try {
      // User data
      const storedUser = localStorage.getItem('forreal_user');
      if (storedUser) {
        this.cache.user = JSON.parse(storedUser);
      }

      // Posts/talks
      const storedPosts = localStorage.getItem('forreal_posts');
      if (storedPosts) {
        this.cache.posts = JSON.parse(storedPosts);
      }

      // Rooms/debates
      const storedRooms = localStorage.getItem('forreal_rooms');
      if (storedRooms) {
        this.cache.rooms = JSON.parse(storedRooms);
      }

      // Notifications
      const storedNotifications = localStorage.getItem('forreal_notifications');
      if (storedNotifications) {
        this.cache.notifications = JSON.parse(storedNotifications);
      }

      // Follows
      const storedFollows = localStorage.getItem('forreal_follows');
      if (storedFollows) {
        this.cache.follows = JSON.parse(storedFollows);
      }

      // Saved posts
      const storedSaved = localStorage.getItem('forreal_saved');
      if (storedSaved) {
        this.cache.saved = JSON.parse(storedSaved);
      }

      // Access token
      const storedToken = localStorage.getItem('forreal_access_token');
      if (storedToken) {
        this.cache.accessToken = storedToken;
      }

      console.debug('[StorageCache] Initialized from localStorage');
    } catch (e) {
      console.error('[StorageCache] Error initializing cache:', e);
      this._clearAll(); // Fallback: clear corrupted storage
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscribe to key changes
  // ─────────────────────────────────────────────────────────────────────────
  subscribe(key, callback) {
    if (!this.subscribers[key]) {
      console.warn(`[StorageCache] Unknown key: ${key}`);
      return () => {};
    }

    this.subscribers[key].push(callback);

    // Return unsubscribe function
    return () => {
      const idx = this.subscribers[key].indexOf(callback);
      if (idx !== -1) {
        this.subscribers[key].splice(idx, 1);
      }
    };
  }

  // Keep multiple tabs/windows synchronized via the storage event
  _attachStorageListener() {
    if (typeof window === 'undefined' || !window.addEventListener) {return;}
    window.addEventListener('storage', (e) => {
      try {
        if (!e) {return;}
        if (e.key === 'forreal_access_token') {
          this.cache.accessToken = e.newValue || null;
        }
        if (e.key === 'forreal_user') {
          this.cache.user = e.newValue ? JSON.parse(e.newValue) : null;
          this._notify('user', this.cache.user);
        }
        if (e.key === 'forreal_rooms') {
          this.cache.rooms = e.newValue ? JSON.parse(e.newValue) : [];
          this._notify('rooms', this.cache.rooms);
        }
      } catch (err) {
        console.warn('[StorageCache] storage event handler errored', err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Notify subscribers of changes
  // ─────────────────────────────────────────────────────────────────────────
  _notify(key, value) {
    if (this.subscribers[key]) {
      this.subscribers[key].forEach((callback) => {
        try {
          callback(value);
        } catch (e) {
          console.error(`[StorageCache] Subscriber error for ${key}:`, e);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User management
  // ─────────────────────────────────────────────────────────────────────────
  getUser() {
    return this.cache.user;
  }

  setUser(user) {
    try {
      this.cache.user = user;
      if (user) {
        localStorage.setItem('forreal_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('forreal_user');
      }
      this._notify('user', user);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting user:', e);
      return false;
    }
  }

  updateUser(updates) {
    const user = { ...this.cache.user, ...updates };
    this.setUser(user);
    return user;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Posts/Talks management
  // ─────────────────────────────────────────────────────────────────────────
  getPosts() {
    return this.cache.posts || [];
  }

  setPosts(posts) {
    try {
      this.cache.posts = posts || [];
      localStorage.setItem('forreal_posts', JSON.stringify(this.cache.posts));
      this._notify('posts', this.cache.posts);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting posts:', e);
      return false;
    }
  }

  addPost(post) {
    const existing = this.getPosts();
    if (existing.some(p => p._id === post._id)) {
      return this.updatePost(post._id, post);
    }
    const posts = [post, ...existing];
    this.setPosts(posts);
    return posts;
  }

  updatePost(postId, updates) {
    const posts = this.getPosts().map((p) =>
      p._id === postId ? { ...p, ...updates } : p
    );
    this.setPosts(posts);
    return posts;
  }

  deletePost(postId) {
    const posts = this.getPosts().filter((p) => p._id !== postId);
    this.setPosts(posts);
    return posts;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rooms/Debates management
  // ─────────────────────────────────────────────────────────────────────────
  getRooms() {
    return this.cache.rooms || [];
  }

  setRooms(rooms) {
    try {
      this.cache.rooms = rooms || [];
      localStorage.setItem('forreal_rooms', JSON.stringify(this.cache.rooms));
      this._notify('rooms', this.cache.rooms);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting rooms:', e);
      return false;
    }
  }

  addRoom(room) {
    const existing = this.getRooms();
    if (existing.some(r => r._id === room._id)) {
      return this.updateRoom(room._id, room);
    }
    const rooms = [room, ...existing];
    this.setRooms(rooms);
    return rooms;
  }

  updateRoom(roomId, updates) {
    const rooms = this.getRooms().map((r) =>
      r._id === roomId ? { ...r, ...updates } : r
    );
    this.setRooms(rooms);
    return rooms;
  }

  deleteRoom(roomId) {
    const rooms = this.getRooms().filter((r) => r._id !== roomId);
    this.setRooms(rooms);
    return rooms;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications management
  // ─────────────────────────────────────────────────────────────────────────
  getNotifications() {
    return this.cache.notifications || [];
  }

  setNotifications(notifications) {
    try {
      this.cache.notifications = notifications || [];
      localStorage.setItem(
        'forreal_notifications',
        JSON.stringify(this.cache.notifications)
      );
      this._notify('notifications', this.cache.notifications);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting notifications:', e);
      return false;
    }
  }

  addNotification(notification) {
    const notifications = [notification, ...this.getNotifications()];
    this.setNotifications(notifications);
    return notifications;
  }

  markNotificationAsRead(notificationId) {
    const notifications = this.getNotifications().map((n) =>
      n._id === notificationId ? { ...n, read: true } : n
    );
    this.setNotifications(notifications);
    return notifications;
  }

  deleteNotification(notificationId) {
    const notifications = this.getNotifications().filter(
      (n) => n._id !== notificationId
    );
    this.setNotifications(notifications);
    return notifications;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Follows management
  // ─────────────────────────────────────────────────────────────────────────
  getFollows() {
    return this.cache.follows || {};
  }

  setFollows(follows) {
    try {
      this.cache.follows = follows || {};
      localStorage.setItem('forreal_follows', JSON.stringify(this.cache.follows));
      this._notify('follows', this.cache.follows);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting follows:', e);
      return false;
    }
  }

  addFollow(userId) {
    const follows = { ...this.getFollows(), [userId]: true };
    this.setFollows(follows);
    return follows;
  }

  removeFollow(userId) {
    const follows = { ...this.getFollows() };
    delete follows[userId];
    this.setFollows(follows);
    return follows;
  }

  isFollowing(userId) {
    return !!this.getFollows()[userId];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Saved posts management
  // ─────────────────────────────────────────────────────────────────────────
  getSaved() {
    return this.cache.saved || [];
  }

  setSaved(saved) {
    try {
      this.cache.saved = saved || [];
      localStorage.setItem('forreal_saved', JSON.stringify(this.cache.saved));
      this._notify('saved', this.cache.saved);
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting saved:', e);
      return false;
    }
  }

  addSaved(postId) {
    const saved = Array.from(new Set([...this.getSaved(), postId]));
    this.setSaved(saved);
    return saved;
  }

  removeSaved(postId) {
    const saved = this.getSaved().filter((id) => id !== postId);
    this.setSaved(saved);
    return saved;
  }

  isSaved(postId) {
    return this.getSaved().includes(postId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Token management
  // ─────────────────────────────────────────────────────────────────────────
  getAccessToken() {
    return this.cache.accessToken;
  }

  setAccessToken(token) {
    try {
      this.cache.accessToken = token;
      if (token) {
        localStorage.setItem('forreal_access_token', token);
      } else {
        localStorage.removeItem('forreal_access_token');
      }
      return true;
    } catch (e) {
      console.error('[StorageCache] Error setting token:', e);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility methods
  // ─────────────────────────────────────────────────────────────────────────
  _clearAll() {
    try {
      localStorage.removeItem('forreal_user');
      localStorage.removeItem('forreal_posts');
      localStorage.removeItem('forreal_rooms');
      localStorage.removeItem('forreal_notifications');
      localStorage.removeItem('forreal_follows');
      localStorage.removeItem('forreal_saved');
      localStorage.removeItem('forreal_access_token');

      this.cache = {
        user: null,
        posts: [],
        rooms: [],
        notifications: [],
        follows: {},
        saved: [],
        accessToken: null,
      };

      console.log('[StorageCache] Cleared all cache');
    } catch (e) {
      console.error('[StorageCache] Error clearing cache:', e);
    }
  }

  clear() {
    this._clearAll();
  }

  // Debugging: get all cache
  getAll() {
    return { ...this.cache };
  }
}

// Singleton instance
export const storageCache = new StorageCache();

export default storageCache;
