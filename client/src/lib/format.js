const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

export const timeAgo = (value, { short = false } = {}) => {
  if (!value) return '';
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < MINUTE) return short ? 'now' : 'just now';
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m${short ? '' : ' ago'}`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h${short ? '' : ' ago'}`;
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d${short ? '' : ' ago'}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: seconds > 31536000 ? 'numeric' : undefined });
};

export const timeLeft = (value) => {
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
};

const compactFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const compact = (n) => compactFormatter.format(n || 0);

export const plural = (count, word, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`;

export const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

export const sameId = (a, b) => Boolean(a && b) && String(a?._id ?? a) === String(b?._id ?? b);

export const hostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const displayName = (user) => user?.profile?.displayName || user?.displayName || user?.username || 'Unknown';
