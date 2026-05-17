import axios from 'axios';

// ─── Constants & Env ─────────────────────────────────────────────────────────
// Fallback to localhost if the env variable isn't set, ensuring it works anywhere
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forreal-uotb.onrender.com/api';

// ─── Axios Instance Setup ───────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds max wait time before aborting
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Ensure cookies (like HttpOnly refresh tokens) are sent with cross-origin requests
  withCredentials: true, 
});

// ─── JWT Refresh Queue Architecture ──────────────────────────────────────────
// These variables manage the state of concurrent requests when a token expires
let isRefreshing = false;
let failedQueue = [];

/**
 * Process the queue of paused requests once a new token is acquired.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Request Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Retrieve the short-lived access token from localStorage (or Zustand store)
    const token = localStorage.getItem('forreal_access_token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ───────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // If the request succeeds, just return the data directly.
    // This stops you from having to write `res.data.data` everywhere in your app.
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 1. Handle Network Errors (Server down, no internet)
    if (!error.response) {
      console.error('[API] Network Error or Server Unreachable:', error);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    const { status, data } = error.response;

    // 2. Handle 401 Unauthorized (Token Expired)
    if (status === 401 && !originalRequest._retry) {
      // If we are already refreshing, pause this request and add it to the queue
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Ping the silent refresh endpoint (relies on HttpOnly cookies)
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        
        // Save the new token
        localStorage.setItem('forreal_access_token', newAccessToken);

        // Resume all queued requests with the new token
        processQueue(null, newAccessToken);
        
        // Retry the original failed request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // If the refresh token is ALSO expired, the user must log in again.
        processQueue(refreshError, null);
        localStorage.removeItem('forreal_access_token');
        
        // Force a hard redirect to login to clear volatile state
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session_expired=true';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 3. Handle 429 Too Many Requests (Rate Limiting)
    if (status === 429) {
      console.warn('[API] Rate limit exceeded.');
      // You could trigger a global Zustand toast notification here
    }

    // Return the formatted error from the backend, or a generic fallback
    const errorMessage = data?.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(errorMessage));
  }
);

// ─── Domain-Driven API Methods ──────────────────────────────────────────────
// By structuring endpoints like this, your React components stay perfectly clean:
// Example: `const data = await api.posts.getFeed({ page: 1 });`

const api = {
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    verifyOtp: (data) => apiClient.post('/auth/verify-otp', data),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/me'),
  },
  
  posts: {
    getFeed: (params) => apiClient.get('/posts/feed', { params }), // params: { page, limit, sort }
    getTrending: () => apiClient.get('/posts/trending'),
    create: (postData) => apiClient.post('/posts', postData),
    getById: (id) => apiClient.get(`/posts/${id}`),
    interact: (id, action) => apiClient.post(`/posts/${id}/interact`, { action }), // action: 'like' | 'dislike'
    repost: (id) => apiClient.post(`/posts/${id}/repost`),
  },
  
  comments: {
    getByPost: (postId, params) => apiClient.get(`/posts/${postId}/comments`, { params }),
    add: (postId, text) => apiClient.post(`/posts/${postId}/comments`, { text }),
    reply: (commentId, text) => apiClient.post(`/comments/${commentId}/reply`, { text }),
  },
  
  rooms: { // Realtime Debate/Discussion Rooms
    getAll: (params) => apiClient.get('/rooms', { params }), // Active, popular, etc.
    create: (roomData) => apiClient.post('/rooms', roomData),
    getById: (roomId) => apiClient.get(`/rooms/${roomId}`),
    join: (roomId) => apiClient.post(`/rooms/${roomId}/join`),
    leave: (roomId) => apiClient.post(`/rooms/${roomId}/leave`),
  },
  
  users: {
    getProfile: (username) => apiClient.get(`/users/${username}`),
    updateProfile: (data) => apiClient.patch('/users/profile', data),
    toggleFollow: (userId) => apiClient.post(`/users/${userId}/follow`),
    getFollowers: (userId) => apiClient.get(`/users/${userId}/followers`),
  },
  
  communities: {
    getAll: () => apiClient.get('/communities'),
    create: (data) => apiClient.post('/communities', data),
    getById: (id) => apiClient.get(`/communities/${id}`),
    join: (id) => apiClient.post(`/communities/${id}/join`),
  },
  
  reports: { // Platform Moderation
    submit: (type, targetId, reason) => apiClient.post('/reports', { type, targetId, reason }),
  }
};

export default api;