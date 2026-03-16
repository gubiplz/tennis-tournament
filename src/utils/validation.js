import { MAX_PLAYERS, MAX_SCORE, MAX_PLAYER_NAME_LENGTH } from '../constants/tournament';

// Standard tennis set scores (winner:loser)
const STANDARD_SET_SCORES = new Set([
  '6:0','6:1','6:2','6:3','6:4','7:5','7:6',
  '0:6','1:6','2:6','3:6','4:6','5:7','6:7'
]);

/**
 * Validate a single tennis set score.
 * Returns { valid: true } or { valid: false, warning: string }
 * Warnings don't block saving — they're informational.
 */
export function validateTennisSet(gems1, gems2) {
  if (gems1 === 0 && gems2 === 0) return { valid: true };
  // Must have a winner (no equal scores except 0:0)
  if (gems1 === gems2) return { valid: false, warning: `Remis ${gems1}:${gems2} — ktoś musi wygrać seta` };
  const key = `${gems1}:${gems2}`;
  if (STANDARD_SET_SCORES.has(key)) return { valid: true };
  // Non-standard but still has a winner — allow with warning
  return { valid: true, warning: `Niestandardowy wynik seta: ${key}` };
}

/**
 * Validate a full tennis match.
 * Returns { valid, warnings: string[] }
 */
export function validateTennisMatch(sets) {
  const warnings = [];
  if (!sets || sets.length === 0) {
    return { valid: false, warnings: ['Wpisz wynik przynajmniej jednego seta'] };
  }

  const playedSets = sets.filter(s => !(s[0] === 0 && s[1] === 0));
  if (playedSets.length === 0) {
    return { valid: false, warnings: ['Wpisz wynik przynajmniej jednego seta'] };
  }

  // Check each set has a winner
  for (let i = 0; i < playedSets.length; i++) {
    const [g1, g2] = playedSets[i];
    if (g1 === g2 && g1 !== 0) {
      warnings.push(`Set ${i + 1}: remis ${g1}:${g2}`);
    }
  }

  return { valid: warnings.filter(w => w.includes('remis')).length === 0, warnings };
}

/**
 * Sanitize a player name: trim, remove control characters, enforce max length.
 */
export function sanitizePlayerName(name) {
  if (typeof name !== 'string') return '';
  return name
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '') // remove control characters
    .slice(0, MAX_PLAYER_NAME_LENGTH);
}

/**
 * Validate imported tournament state.
 * Returns { valid: true, state } or { valid: false, error: string }
 */
export function validateImportedState(state) {
  if (!state || typeof state !== 'object') {
    return { valid: false, error: 'Nieprawidłowy format danych' };
  }

  // Required fields
  if (!state.id || typeof state.id !== 'string') {
    return { valid: false, error: 'Brak identyfikatora turnieju' };
  }

  if (!['dashboard', 'setup', 'active', 'completed'].includes(state.status)) {
    return { valid: false, error: 'Nieprawidłowy status turnieju' };
  }

  if (!Array.isArray(state.players)) {
    return { valid: false, error: 'Brak listy graczy' };
  }

  if (state.players.length > MAX_PLAYERS) {
    return { valid: false, error: `Maksymalnie ${MAX_PLAYERS} graczy` };
  }

  // Validate players
  for (const player of state.players) {
    if (!player || typeof player.id !== 'string' || typeof player.name !== 'string') {
      return { valid: false, error: 'Nieprawidłowe dane gracza' };
    }
  }

  if (!Array.isArray(state.matches)) {
    return { valid: false, error: 'Brak listy meczów' };
  }

  // Validate matches
  for (const match of state.matches) {
    if (!match || typeof match.id === 'undefined') {
      return { valid: false, error: 'Nieprawidłowe dane meczu' };
    }
    if (typeof match.score1 === 'number' && (match.score1 < 0 || match.score1 > MAX_SCORE)) {
      return { valid: false, error: `Wynik musi być między 0 a ${MAX_SCORE}` };
    }
    if (typeof match.score2 === 'number' && (match.score2 < 0 || match.score2 > MAX_SCORE)) {
      return { valid: false, error: `Wynik musi być między 0 a ${MAX_SCORE}` };
    }
  }

  if (typeof state.currentMatchIndex !== 'number' || state.currentMatchIndex < 0) {
    return { valid: false, error: 'Nieprawidłowy indeks meczu' };
  }

  if (!state.settings || typeof state.settings !== 'object') {
    return { valid: false, error: 'Brak ustawień turnieju' };
  }

  // Sanitize player names in the validated state
  const sanitizedState = {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      name: sanitizePlayerName(p.name)
    })),
    changeLog: Array.isArray(state.changeLog) ? state.changeLog : []
  };

  return { valid: true, state: sanitizedState };
}
