// ─────────────────────────────────────────────────────────────────────────────
// nullSafety.js – Defensive utilities for null/undefined handling
// ─────────────────────────────────────────────────────────────────────────────
// Provides helpers to safely access nested object properties and handle undefined.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely get nested property from object with fallback
 * Example: safeGet(user, 'profile.avatar', 'default.png')
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current !== undefined ? current : defaultValue;
  } catch (e) {
    console.warn(`[safeGet] Error accessing ${path}:`, e);
    return defaultValue;
  }
};

/**
 * Defensive array access
 */
export const safeArray = (arr, defaultValue = []) => {
  return Array.isArray(arr) ? arr : defaultValue;
};

/**
 * Defensive map/object iteration
 */
export const safeEntries = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  try {
    return Object.entries(obj);
  } catch {
    return [];
  }
};

/**
 * Defensive string formatting
 */
export const safeString = (value, defaultValue = '') => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

/**
 * Safe user identity extraction
 */
export const getUserId = (user) => {
  if (!user) return null;
  return user._id || user.id || user.username || null;
};

/**
 * Safe user display name
 */
export const getUserDisplayName = (user, fallback = 'Unknown User') => {
  if (!user) return fallback;
  return user.displayName || user.display_name || user.name || user.username || fallback;
};

/**
 * Safe user avatar URL
 */
export const getUserAvatar = (user, seed = 'default') => {
  if (!user) return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`;
  if (user.avatar) return user.avatar;
  const username = user.username || user._id || seed;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${username}`;
};

/**
 * Safe post data normalization
 */
export const normalizePost = (post) => {
  if (!post) return null;
  
  return {
    _id: post._id || post.id || `post_${Date.now()}`,
    content: post.content || '',
    author: post.author || {},
    likes: safeArray(post.likes),
    dislikes: safeArray(post.dislikes),
    comments: safeArray(post.comments),
    media: safeArray(post.media),
    agrees: safeArray(post.agrees),
    disagrees: safeArray(post.disagrees),
    facts: safeArray(post.facts),
    caps: safeArray(post.caps),
    misleadings: safeArray(post.misleadings),
    validPoints: safeArray(post.validPoints),
    verifications: safeArray(post.verifications),
    disputes: safeArray(post.disputes),
    tags: safeArray(post.tags),
    sourceUrl: post.sourceUrl || '',
    isAnonymous: post.isAnonymous || false,
    createdAt: post.createdAt || new Date().toISOString(),
  };
};

/**
 * Safe room data normalization
 */
export const normalizeRoom = (room) => {
  if (!room) return null;
  
  return {
    _id: room._id || room.id || `room_${Date.now()}`,
    title: room.title || room.name || 'Untitled Debate',
    description: room.description || '',
    pro: room.pro || { position: 'Pro', participants: [] },
    con: room.con || { position: 'Con', participants: [] },
    participants: safeArray(room.participants),
    messages: safeArray(room.messages),
    status: room.status || 'active',
    createdAt: room.createdAt || new Date().toISOString(),
    updatedAt: room.updatedAt || new Date().toISOString(),
    viewCount: room.viewCount || 0,
  };
};

/**
 * Safe notification normalization
 */
export const normalizeNotification = (notif) => {
  if (!notif) return null;
  
  return {
    _id: notif._id || notif.id || `notif_${Date.now()}`,
    type: notif.type || 'info',
    title: notif.title || '',
    message: notif.message || '',
    actor: notif.actor || null,
    target: notif.target || null,
    read: notif.read === true,
    createdAt: notif.createdAt || new Date().toISOString(),
  };
};

/**
 * Safe comparison for equality
 */
export const safeEquals = (a, b) => {
  try {
    return a === b || JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export default {
  safeGet,
  safeArray,
  safeEntries,
  safeString,
  getUserId,
  getUserDisplayName,
  getUserAvatar,
  normalizePost,
  normalizeRoom,
  normalizeNotification,
  safeEquals,
};
