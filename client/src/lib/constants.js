// Keep in sync with server/config/debateOptions.js.
export const CATEGORIES = [
  'Technology',
  'Politics',
  'Philosophy',
  'Science',
  'Economics',
  'Ethics',
  'Culture',
  'Sports',
  'Climate',
  'Society',
];

export const DURATIONS = [
  { value: 60, label: '1 hour — blitz' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
  { value: 2880, label: '48 hours' },
  { value: 10080, label: '1 week' },
];

export const INTRO_SEEN_KEY = 'forreal:intro-seen:v2';

export const MAX_TALK_LENGTH = 2000;
export const MAX_ARGUMENT_LENGTH = 2000;
