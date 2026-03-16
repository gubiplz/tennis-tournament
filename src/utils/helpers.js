/**
 * Polish pluralization helper.
 * pluralize(1, 'mecz', 'mecze', 'meczów') → 'mecz'
 * pluralize(3, 'mecz', 'mecze', 'meczów') → 'mecze'
 * pluralize(5, 'mecz', 'mecze', 'meczów') → 'meczów'
 */
export function pluralize(count, one, few, many) {
  const abs = Math.abs(count);
  if (abs === 1) return one;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/**
 * Generate a consistent color from a string (player name).
 */
const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-red-400 to-red-600',
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Get avatar gradient class for a player name.
 */
export function getAvatarColor(name) {
  return AVATAR_COLORS[hashString(name || '') % AVATAR_COLORS.length];
}

/**
 * Get first letter(s) of a name for avatar initials.
 */
/**
 * Parse set scores from text input.
 * Supports: "6:4 3:6 7:5", "6-4, 3-6, 7-5", "6:4,3:6,7:5"
 * Returns array of [gems1, gems2] or null if unparseable.
 */
export function parseSetsFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;

  // Split by common separators: space, comma, semicolon (with optional whitespace)
  const parts = cleaned.split(/[\s,;]+/).filter(Boolean);
  const sets = [];

  for (const part of parts) {
    // Match "6:4" or "6-4"
    const match = part.match(/^(\d{1,2})[:/-](\d{1,2})$/);
    if (!match) return null;
    sets.push([parseInt(match[1]), parseInt(match[2])]);
  }

  return sets.length > 0 ? sets : null;
}

/**
 * Format sets array to display string.
 * [[6,4],[3,6],[7,5]] → "6:4, 3:6, 7:5"
 */
export function formatSets(sets) {
  if (!sets || sets.length === 0) return '';
  return sets.filter(s => !(s[0] === 0 && s[1] === 0)).map(s => `${s[0]}:${s[1]}`).join(', ');
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}
