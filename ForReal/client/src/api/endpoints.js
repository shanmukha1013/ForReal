// Centralized REST endpoint constants (client-side)
// IMPORTANT: axios baseURL is already configured to end with /api.

export const API = {
  // Explore search
  exploreSearch: '/explore/search',

  // Profiles
  userProfileByIdentifier: (identifier) => `/users/${encodeURIComponent(identifier)}`,
  userRelationship: (userId) => `/users/${encodeURIComponent(userId)}/relationship`,

  // Follow/unfollow
  followUser: (userId) => `/users/${encodeURIComponent(userId)}/follow`,

  // Messaging
  dmByUsername: '/messages/dm',
  conversations: '/chat/conversations',
  messages: (conversationId) => `/chat/${encodeURIComponent(conversationId)}`,
};

