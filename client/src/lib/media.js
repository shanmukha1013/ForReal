// Uploaded media is stored by the API as a relative path ("/uploads/x.jpg").
// In production the client and API live on different origins, so relative
// paths must be resolved against the API origin rather than the page.
const apiOrigin = (() => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && /^https?:\/\//.test(apiUrl)) return new URL(apiUrl).origin;
  return '';
})();

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(https?:|blob:|data:image\/)/.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${apiOrigin}${trimmed}`;
  return '';
};
