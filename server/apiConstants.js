// Centralized REST endpoint constants (server-side)
// Keep paths aligned with frontend axios baseURL (VITE_API_BASE_URL ends with /api).

export const API = {
  exploreSearch: '/api/explore/search',
  // User search / discovery
  searchUsers: '/api/search/users',

  // Profiles
  userProfileByIdentifier: (identifier) => `/api/users/${encodeURIComponent(identifier)}`,
  userRelationship: (userId) => `/api/users/${encodeURIComponent(userId)}/relationship`,

  // Follow/unfollow (supports POST + DELETE)
  followUser: (userId) => `/api/users/${encodeURIComponent(userId)}/follow`,

  // Messaging
  conversations: '/api/chat/conversations',
  messages: (conversationId) => `/api/chat/${encodeURIComponent(conversationId)}`,
  dmByUsername: '/api/messages/dm',
};

